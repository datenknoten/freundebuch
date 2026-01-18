import type { ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import { FriendsService } from '../../services/friends/index.js';
import type { AppContext } from '../../types/context.js';
import { isAppError, toError } from '../../utils/errors.js';

const app = new Hono<AppContext>();

/**
 * GET /api/friends/dates/upcoming
 * Get upcoming important dates across all friends
 * Query params: days (default 30), limit (default 10)
 */
app.get('/dates/upcoming', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const daysParam = c.req.query('days');
  const limitParam = c.req.query('limit');

  const days = daysParam ? Math.min(365, Math.max(1, Number.parseInt(daysParam, 10) || 30)) : 30;
  const limit = limitParam ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 10)) : 10;

  try {
    const friendsService = new FriendsService(db, logger);
    const upcomingDates = await friendsService.getUpcomingDates(user.userId, { days, limit });

    return c.json(upcomingDates);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get upcoming dates');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get upcoming dates' }, 500);
  }
});

/**
 * GET /api/friends/network-graph
 * Get network graph data for visualization
 * Returns all non-archived friends as nodes and their relationships as links
 */
app.get('/network-graph', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const friendsService = new FriendsService(db, logger);
    const graphData = await friendsService.getNetworkGraphData(user.userId);

    return c.json(graphData);
  } catch (error) {
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get network graph data');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to get network graph data');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get network graph data' }, 500);
  }
});

/**
 * GET /api/friends/relationship-types
 * Get all relationship types grouped by category
 */
app.get('/relationship-types', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const friendsService = new FriendsService(db, logger);
    const types = await friendsService.getRelationshipTypes();

    return c.json(types);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get relationship types');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get relationship types' }, 500);
  }
});

export default app;
