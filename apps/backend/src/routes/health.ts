import { Hono } from 'hono';
import type { AppContext } from '../types/context.js';
import { toError } from '../utils/errors.js';

const health = new Hono<AppContext>();

health.get('/', async (c) => {
  const db = c.get('db');
  const logger = c.get('logger');

  let dbHealthy = false;
  const client = await db.connect();
  try {
    await client.query('SELECT 1');
    dbHealthy = true;
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Database connection check failed');
    dbHealthy = false;
  } finally {
    client.release();
  }

  const health = {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'disconnected',
  };

  const statusCode = dbHealthy ? 200 : 503;
  return c.json(health, statusCode);
});

export default health;
