import { createServer } from 'node:http';
import pg from 'pg';
import { getConfig } from './config.js';
import { createMcpRequestHandler, type Session } from './http-handler.js';
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

const sessions = new Map<string, Session>();

const httpServer = createServer(createMcpRequestHandler({ services, logger, sessions }));

httpServer.listen(config.MCP_PORT, () => {
  logger.info({ port: config.MCP_PORT }, 'Freundebuch MCP server started');
});

let isShuttingDown = false;

function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received, shutting down MCP server`);

  httpServer.close(async () => {
    await Promise.allSettled([...sessions.values()].map((session) => session.transport.close()));
    sessions.clear();

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
