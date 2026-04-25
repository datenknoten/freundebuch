import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Logger } from 'pino';
import { createMcpServer } from './server.js';
import type { Services } from './utils/service-factory.js';

// Brute-force / rate limiting is handled at the infrastructure layer — see
// the `limit_req_zone zone=mcp_auth` directives in `docker/nginx*.conf*`.
// Same design as `apps/sabredav/src/Auth/AppPasswordBackend.php`: an in-process
// limiter would not survive restarts or span replicas. Failed auth attempts
// are still logged via `logger.warn` so infrastructure alerting can trigger.

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
 * reading any body. Otherwise stream the body, and as soon as the cap is
 * exceeded resolve with `too-large` immediately (so the caller can send 413
 * without waiting for the client to finish uploading). The remaining body is
 * drained in the background to keep the connection healthy.
 */
async function readBody(req: IncomingMessage, maxBytes: number): Promise<ReadResult> {
  const declared = Number.parseInt(req.headers['content-length'] ?? '', 10);
  if (Number.isFinite(declared) && declared > maxBytes) {
    req.resume();
    return { ok: false, reason: 'too-large' };
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const cleanup = () => {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
    };
    const settle = (value: ReadResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const onData = (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        chunks.length = 0;
        settle({ ok: false, reason: 'too-large' });
        req.resume(); // drain remaining bytes in background
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      settle({ ok: true, body: Buffer.concat(chunks).toString('utf-8') });
    };
    const onError = () => {
      settle({ ok: false, reason: 'stream-error' });
    };

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
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
    // `Host` is optional in HTTP/1.0 and can be missing behind some proxies, so
    // use a fixed base — we only care about pathname here, not the host.
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    if (pathname === '/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }
    if (pathname !== '/mcp') {
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
