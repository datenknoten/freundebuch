import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleError } from '@datenknoten/kit/http';
import type { Auth } from '@freundebuch/backend/lib/auth.js';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import type pg from 'pg';
import type { Logger } from 'pino';
import { createMcpServer } from './server.js';
import type { Session } from './session.js';
import {
  type BearerAuthContext,
  getPublicBaseUrl,
  verifyBearerToken,
} from './utils/bearer-auth.js';
import { getClientIp } from './utils/client-ip.js';
import type { Services } from './utils/service-factory.js';

// Brute-force / rate limiting is handled at the infrastructure layer — see
// the `limit_req_zone zone=mcp_auth` directives in `docker/nginx*.conf*`.
// Same design as `apps/sabredav/src/Auth/AppPasswordBackend.php`: an in-process
// limiter would not survive restarts or span replicas. Failed auth attempts
// are still logged via `logger.warn` so infrastructure alerting can trigger.

export interface McpRequestHandlerOptions {
  services: Services;
  logger: Logger;
  /** Validates OAuth bearer tokens against the co-located authorization server. */
  auth: Auth;
  sessions: Map<string, Session>;
  /** Shared pg pool — used to resolve OAuth subjects to the legacy external_id. */
  pool: pg.Pool;
  /** Public origin, for the OAuth protected-resource metadata URL in 401s. */
  betterAuthUrl?: string;
  maxBodyBytes?: number;
}

type AuthScheme = 'Bearer' | 'Basic';

/** `user` is absent when the request is not authenticated; `scheme` picks the 401 challenge. */
interface Authentication {
  scheme: AuthScheme;
  user?: BearerAuthContext;
}

const DEFAULT_MAX_BODY_BYTES = 1_048_576; // 1 MiB; MCP JSON-RPC bodies are small.

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extra?: Record<string, string>,
) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...(extra ?? {}) });
  res.end(JSON.stringify(body));
}

/**
 * 401 advertising the OAuth 2.1 flow. This is the default challenge for
 * requests without credentials: the `WWW-Authenticate: Bearer` header with a
 * `resource_metadata` pointer is what makes an MCP client (e.g. claude.ai)
 * discover the authorization server and start the OAuth flow (RFC 9728).
 */
function sendBearerUnauthorized(res: ServerResponse, req: IncomingMessage, betterAuthUrl?: string) {
  const base = getPublicBaseUrl(req, betterAuthUrl);
  const resourceMetadata = `${base}/.well-known/oauth-protected-resource`;
  sendJson(
    res,
    401,
    { error: 'Unauthorized' },
    {
      'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadata}"`,
      // Browser-based MCP clients need to read the challenge to begin OAuth.
      'Access-Control-Expose-Headers': 'WWW-Authenticate',
    },
  );
}

/**
 * 401 with a Basic challenge. Only used when a client actually attempted Basic
 * auth (app password) but failed, so existing CLI/DAV-style clients still get a
 * Basic prompt instead of being pushed into the OAuth flow.
 */
function sendBasicUnauthorized(res: ServerResponse) {
  sendJson(
    res,
    401,
    { error: 'Unauthorized' },
    { 'WWW-Authenticate': 'Basic realm="Freundebuch MCP"' },
  );
}

/**
 * 401 whose challenge scheme matches the credentials the client presented — a
 * Bearer challenge for OAuth clients (so they can restart RFC 9728 discovery /
 * reauth), a Basic challenge for app-password clients. Also used for requests
 * that authenticated successfully but are still rejected, e.g. a session id
 * owned by a different user: re-challenging in the wrong scheme would push an
 * OAuth client into Basic and break its reauth flow.
 */
function sendUnauthorized(
  res: ServerResponse,
  req: IncomingMessage,
  scheme: AuthScheme,
  betterAuthUrl?: string,
) {
  if (scheme === 'Bearer') {
    sendBearerUnauthorized(res, req, betterAuthUrl);
    return;
  }
  sendBasicUnauthorized(res);
}

/**
 * Two schemes are accepted: Bearer (OAuth access tokens issued by the Better
 * Auth authorization server, used by claude.ai and other remote MCP clients)
 * and Basic (app passwords, used by existing CLI/desktop clients). A request
 * without credentials or with an unsupported scheme is challenged with Bearer,
 * so MCP clients begin OAuth discovery; app-password clients send Basic
 * proactively.
 */
async function authenticate(req: IncomingMessage, options: McpRequestHandlerOptions) {
  const { auth, pool, services, logger } = options;
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ') === true) {
    const user = await verifyBearerToken(req, { auth, pool, logger });
    if (user === undefined) {
      logger.warn(
        { ip: getClientIp(req) },
        'MCP bearer-auth failure (infrastructure rate limiting should throttle repeats)',
      );
      return { scheme: 'Bearer' } satisfies Authentication;
    }
    return { scheme: 'Bearer', user } satisfies Authentication;
  }

  if (authHeader?.startsWith('Basic ') !== true) {
    return { scheme: 'Bearer' } satisfies Authentication;
  }

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) {
    return { scheme: 'Basic' } satisfies Authentication;
  }

  const email = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);
  const appPassword = await services.appPasswords.verifyAppPassword(email, password);
  if (appPassword === undefined) {
    logger.warn(
      { ip: getClientIp(req), email },
      'MCP basic-auth failure (infrastructure rate limiting should throttle repeats)',
    );
    return { scheme: 'Basic' } satisfies Authentication;
  }

  return {
    scheme: 'Basic',
    user: { userId: appPassword.userId, email: appPassword.email },
  } satisfies Authentication;
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
    // Swallow drain-time errors (client abort, socket reset). Without a listener,
    // an `'error'` event would crash the process via Node's default handler.
    req.on('error', () => undefined);
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
        // settle() ran cleanup() and detached the original `'error'` listener.
        // Reattach a no-op so a drain-time abort doesn't crash the process.
        req.on('error', () => undefined);
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
    if (req.rawHeaders[i]?.toLowerCase() === 'mcp-session-id') {
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

export function createMcpRequestHandler(options: McpRequestHandlerOptions) {
  const { services, logger, sessions, betterAuthUrl } = options;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  return async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    try {
      await routeRequest(req, res);
    } catch (error) {
      const { status, body } = handleError(error, logger);
      // The MCP transport may have started streaming before it failed; the
      // status line is gone then, so only close the response.
      if (res.headersSent === true) {
        res.end();
        return;
      }
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    }
  };

  async function routeRequest(req: IncomingMessage, res: ServerResponse) {
    // `Host` is optional in HTTP/1.0 and can be missing behind some proxies, so
    // use a fixed base — we only care about pathname here, not the host.
    const url = new URL(req.url ?? '/', 'http://localhost');
    const trimmedPathname = url.pathname.replace(/\/+$/, '');
    const pathname = trimmedPathname === '' ? '/' : trimmedPathname;

    if (pathname === '/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }
    if (pathname !== '/mcp') {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    const { scheme, user } = await authenticate(req, options);
    if (user === undefined) {
      sendUnauthorized(res, req, scheme, betterAuthUrl);
      return;
    }

    const sessionHeader = readSessionIdHeader(req, res);
    if (sessionHeader.ok === false) {
      return;
    }
    const sessionId = sessionHeader.sessionId;
    const session = sessionId === undefined ? undefined : sessions.get(sessionId);

    if (req.method === 'POST') {
      const read = await readBody(req, maxBodyBytes);
      if (read.ok === false) {
        if (read.reason === 'too-large') {
          sendJson(res, 413, { error: 'Payload Too Large', maxBytes: maxBodyBytes });
          return;
        }
        sendJson(res, 400, { error: 'Request stream error' });
        return;
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(read.body);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON' });
        return;
      }

      if (session !== undefined) {
        if (session.userId !== user.userId) {
          sendUnauthorized(res, req, scheme, betterAuthUrl);
          return;
        }
        await session.transport.handleRequest(req, res, parsedBody);
        return;
      }

      const newSessionId = randomUUID();
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      const userId = user.userId;
      const server = createMcpServer(services, () => userId);
      sessions.set(newSessionId, { transport, userId });

      transport.onclose = function onSessionClose() {
        sessions.delete(newSessionId);
        logger.debug({ sessionId: newSessionId }, 'MCP session closed');
      };

      await server.connect(transport);
      logger.info({ sessionId: newSessionId, email: user.email }, 'New MCP session established');
      await transport.handleRequest(req, res, parsedBody);
      return;
    }

    if (req.method === 'GET') {
      if (session === undefined) {
        sendJson(res, 400, { error: 'Missing or invalid session ID' });
        return;
      }
      if (session.userId !== user.userId) {
        sendUnauthorized(res, req, scheme, betterAuthUrl);
        return;
      }
      await session.transport.handleRequest(req, res);
      return;
    }

    if (req.method === 'DELETE') {
      if (sessionId === undefined || session === undefined) {
        sendJson(res, 404, { error: 'Session not found' });
        return;
      }
      if (session.userId !== user.userId) {
        sendUnauthorized(res, req, scheme, betterAuthUrl);
        return;
      }
      await session.transport.handleRequest(req, res);
      sessions.delete(sessionId);
      logger.info({ sessionId }, 'MCP session terminated');
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  }
}
