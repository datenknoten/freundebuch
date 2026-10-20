import { createServer, type Server } from 'node:http';
import { exitWith } from '@datenknoten/kit/cli';
import { createRootLogger } from '@datenknoten/kit/logger';
import { createAuth } from '@freundebuch/backend/lib/auth.js';
import { createAuthPool } from '@freundebuch/backend/lib/auth-pool.js';
import { LOG_REDACT_PATHS } from '@freundebuch/backend/utils/logger.js';
import pg from 'pg';
import { loadConfig } from './config.js';
import { createMcpRequestHandler } from './http-handler.js';
import type { Session } from './session.js';
import { createServices } from './utils/service-factory.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const PRETTY_TRANSPORT = { target: 'pino-pretty', options: { colorize: true } };

function closeHttpServer(httpServer: Server) {
  return new Promise<void>((resolve, reject) => {
    httpServer.close((err) => (err === undefined ? resolve() : reject(err)));
  });
}

function listen(httpServer: Server, port: number) {
  return new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });
}

async function main() {
  const config = loadConfig();
  const logger = createRootLogger(config, {
    // The MCP server logs the same domain objects as the backend, so it shares
    // the backend's redaction list rather than growing a second one.
    redactPaths: LOG_REDACT_PATHS,
    ...(config.ENV === 'development' ? { transport: PRETTY_TRANSPORT } : {}),
  });

  const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
  });
  const authPool = createAuthPool({ config, logger: logger.child({ module: 'auth-db' }) });
  const auth = createAuth({ config, pool: authPool, logger: logger.child({ module: 'auth' }) });
  const services = createServices({ db: pool, logger, photoConfig: config });
  const sessions = new Map<string, Session>();

  const httpServer = createServer(
    createMcpRequestHandler({
      services,
      logger: logger.child({ module: 'http' }),
      sessions,
      pool,
      auth,
      betterAuthUrl: config.BETTER_AUTH_URL,
    }),
  );

  await listen(httpServer, config.MCP_PORT);
  logger.info({ port: config.MCP_PORT }, 'Freundebuch MCP server started');

  let isShuttingDown = false;

  async function shutdown(signal: NodeJS.Signals) {
    if (isShuttingDown === true) {
      return;
    }
    isShuttingDown = true;
    logger.info({ signal }, 'Shutting down MCP server');

    // unref() so this timer alone does not keep the event loop alive.
    setTimeout(forceExit, SHUTDOWN_TIMEOUT_MS).unref();

    try {
      // Open SSE streams hold their connections, so the sessions must close
      // before the server can finish draining.
      await Promise.all([
        closeHttpServer(httpServer),
        Promise.allSettled([...sessions.values()].map((session) => session.transport.close())),
      ]);
      sessions.clear();
    } finally {
      await Promise.all([pool.end(), authPool.end()]);
    }

    logger.info('MCP server shutdown complete');
    process.exit(0);
  }

  function forceExit() {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Forced shutdown after timeout');
    process.exit(1);
  }

  function onSignal(signal: NodeJS.Signals) {
    void shutdown(signal).catch(exitWith);
  }

  process.on('SIGTERM', onSignal);
  process.on('SIGINT', onSignal);
}

void main().catch(exitWith);
