import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Logger } from 'pino';
import { createMcpServer } from './server.js';
import type { Services } from './utils/service-factory.js';

// Brute-force / rate limiting is intentionally handled at the infrastructure
// layer (nginx `limit_req_zone`, WAF, or load balancer) — same design as
// `apps/sabredav/src/Auth/AppPasswordBackend.php`. An in-process limiter would
// not survive restarts or span replicas. Failed auth attempts are logged via
// `logger.warn` so infrastructure alerting can trigger.

export interface Session {
  transport: StreamableHTTPServerTransport;
  userId: string;
}

interface HandlerDeps {
  services: Services;
  logger: Logger;
  sessions: Map<string, Session>;
  maxBodyBytes?: number;
}

const DEFAULT_MAX_BODY_BYTES = 1_048_576; // 1 MiB; MCP JSON-RPC bodies are small.

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extra?: Record<string, string>,
) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...(extra ?? {}) });
  res.end(JSON.stringify(body));
}

function sendUnauthorized(res: ServerResponse) {
  sendJson(
    res,
    401,
    { error: 'Unauthorized' },
    { 'WWW-Authenticate': 'Basic realm="Freundebuch MCP"' },
  );
}

type ReadResult = { ok: true; body: string } | { ok: false; reason: 'too-large' | 'stream-error' };

/**
 * Read request body with a byte cap. Uses Buffer.concat + utf-8 decode at end
 * so multi-byte characters split across TCP chunks are handled correctly.
 *
 * If `Content-Length` is present and exceeds the cap, short-circuit before
 * reading any body. Otherwise, stream the body and once the cap is reached
 * stop buffering (keep draining data events so the client finishes sending
 * and reads the 413 response cleanly instead of hitting ECONNRESET).
 */
async function readBody(req: IncomingMessage, maxBytes: number): Promise<ReadResult> {
  const declared = Number.parseInt(req.headers['content-length'] ?? '', 10);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: 'too-large' };
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let tooLarge = false;
    let settled = false;
    const settle = (value: ReadResult) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return; // keep draining; client will finish and we respond after 'end'
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        settle({ ok: false, reason: 'too-large' });
        return;
      }
      settle({ ok: true, body: Buffer.concat(chunks).toString('utf-8') });
    });
    req.on('error', () => {
      settle({ ok: false, reason: 'stream-error' });
    });
  });
}

/**
 * Extract mcp-session-id from headers. Rejects duplicate headers.
 *
 * Node's http parser merges duplicate instances of non-listed headers into a
 * comma-joined string (only certain headers surface as arrays), so a naive
 * `Array.isArray` check would miss duplicates. Walk `req.rawHeaders` directly
 * to count occurrences.
 */
function readSessionIdHeader(
  req: IncomingMessage,
  res: ServerResponse,
): { ok: true; sessionId: string | undefined } | { ok: false } {
  let count = 0;
  let value: string | undefined;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (req.rawHeaders[i].toLowerCase() === 'mcp-session-id') {
      count++;
      if (count === 1) value = req.rawHeaders[i + 1];
      if (count > 1) {
        sendJson(res, 400, { error: 'Duplicate mcp-session-id header' });
        return { ok: false };
      }
    }
  }
  return { ok: true, sessionId: value };
}

export function createMcpRequestHandler(
  deps: HandlerDeps,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const { services, logger, sessions } = deps;
  const maxBodyBytes = deps.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  return async function handleRequest(req, res) {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname === '/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }
    if (url.pathname !== '/mcp') {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    // Authenticate every request
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Basic ')) {
      sendUnauthorized(res);
      return;
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) {
      sendUnauthorized(res);
      return;
    }

    const email = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    const authResult = await services.appPasswords.verifyAppPassword(email, password);
    if (!authResult) {
      logger.warn(
        { ip: getClientIp(req), email },
        'MCP basic-auth failure (infrastructure rate limiting should throttle repeats)',
      );
      sendUnauthorized(res);
      return;
    }

    const sessionHeader = readSessionIdHeader(req, res);
    if (!sessionHeader.ok) return;
    const sessionId = sessionHeader.sessionId;

    if (req.method === 'POST') {
      const read = await readBody(req, maxBodyBytes);
      if (!read.ok) {
        if (read.reason === 'too-large') {
          sendJson(res, 413, { error: 'Payload Too Large', maxBytes: maxBodyBytes });
        } else {
          sendJson(res, 400, { error: 'Request stream error' });
        }
        return;
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(read.body);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' });
        return;
      }

      const existingSession = sessionId ? sessions.get(sessionId) : undefined;
      if (existingSession) {
        if (existingSession.userId !== authResult.userId) {
          sendUnauthorized(res);
          return;
        }
        await existingSession.transport.handleRequest(req, res, parsedBody);
        return;
      }

      // New session
      const newSessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      const userId = authResult.userId;
      const server = createMcpServer(services, () => userId);
      sessions.set(newSessionId, { transport, userId });

      transport.onclose = () => {
        sessions.delete(newSessionId);
        logger.debug({ sessionId: newSessionId }, 'MCP session closed');
      };

      await server.connect(transport);
      logger.info(
        { sessionId: newSessionId, email: authResult.email },
        'New MCP session established',
      );
      await transport.handleRequest(req, res, parsedBody);
      return;
    }

    if (req.method === 'GET') {
      const getSession = sessionId ? sessions.get(sessionId) : undefined;
      if (!getSession) {
        sendJson(res, 400, { error: 'Missing or invalid session ID' });
        return;
      }
      if (getSession.userId !== authResult.userId) {
        sendUnauthorized(res);
        return;
      }
      await getSession.transport.handleRequest(req, res);
      return;
    }

    if (req.method === 'DELETE') {
      const deleteSession = sessionId ? sessions.get(sessionId) : undefined;
      if (!deleteSession) {
        sendJson(res, 404, { error: 'Session not found' });
        return;
      }
      if (deleteSession.userId !== authResult.userId) {
        sendUnauthorized(res);
        return;
      }
      await deleteSession.transport.handleRequest(req, res);
      sessions.delete(sessionId as string);
      logger.info({ sessionId }, 'MCP session terminated');
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  };
}
