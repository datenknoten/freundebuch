import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import pg from 'pg';
import { getConfig } from './config.js';
import { createMcpServer } from './server.js';
import { createLogger } from './utils/logger.js';
import { createServices } from './utils/service-factory.js';

const config = getConfig();
const logger = createLogger(config);

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  min: config.DATABASE_POOL_MIN,
  max: config.DATABASE_POOL_MAX,
});

const services = createServices(pool, logger);

interface Session {
  transport: StreamableHTTPServerTransport;
  userId: string;
}

const sessions = new Map<string, Session>();

async function authenticate(
  req: IncomingMessage,
): Promise<{ userId: string; email: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Basic ')) {
    return null;
  }

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const email = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  const result = await services.appPasswords.verifyAppPassword(email, password);
  if (!result) {
    return null;
  }

  return { userId: result.userId, email: result.email };
}

function sendUnauthorized(res: ServerResponse) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Freundebuch MCP"',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  // Only handle /mcp endpoint
  if (url.pathname !== '/mcp') {
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  // Authenticate every request
  const auth = await authenticate(req);
  if (!auth) {
    sendUnauthorized(res);
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (req.method === 'POST') {
    // Read request body
    const body = await new Promise<string>((resolve, reject) => {
      let data = '';
      req.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const existingSession = sessionId ? sessions.get(sessionId) : undefined;
    if (existingSession) {
      // Existing session — verify same user
      if (existingSession.userId !== auth.userId) {
        sendUnauthorized(res);
        return;
      }
      await existingSession.transport.handleRequest(req, res, parsedBody);
    } else {
      // New session — create transport and McpServer
      const newSessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      const userId = auth.userId;
      const server = createMcpServer(services, () => userId);

      sessions.set(newSessionId, { transport, userId });

      transport.onclose = () => {
        sessions.delete(newSessionId);
        logger.debug({ sessionId: newSessionId }, 'MCP session closed');
      };

      await server.connect(transport);
      logger.info({ sessionId: newSessionId, email: auth.email }, 'New MCP session established');

      await transport.handleRequest(req, res, parsedBody);
    }
  } else if (req.method === 'GET') {
    // SSE stream for existing session
    const getSession = sessionId ? sessions.get(sessionId) : undefined;
    if (!getSession) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing or invalid session ID' }));
      return;
    }
    if (getSession.userId !== auth.userId) {
      sendUnauthorized(res);
      return;
    }
    await getSession.transport.handleRequest(req, res);
  } else if (req.method === 'DELETE') {
    // Session termination
    const deleteSession = sessionId ? sessions.get(sessionId) : undefined;
    if (!deleteSession) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    if (deleteSession.userId !== auth.userId) {
      sendUnauthorized(res);
      return;
    }
    await deleteSession.transport.handleRequest(req, res);
    sessions.delete(sessionId as string);
    logger.info({ sessionId }, 'MCP session terminated');
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
}

const httpServer = createServer(handleRequest);

httpServer.listen(config.MCP_PORT, () => {
  logger.info({ port: config.MCP_PORT }, 'Freundebuch MCP server started');
});

// Graceful shutdown
let isShuttingDown = false;

function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received, shutting down MCP server`);

  httpServer.close(async () => {
    // Close all active sessions
    for (const [id, session] of sessions) {
      try {
        await session.transport.close();
      } catch {
        // Ignore close errors during shutdown
      }
      sessions.delete(id);
    }

    await pool.end();
    logger.info('MCP server shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
