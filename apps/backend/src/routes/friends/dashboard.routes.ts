import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import { FriendsService } from '../../services/friends/index.js';
import type { AppContext } from '../../types/context.js';

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

  const friendsService = new FriendsService(db, logger);
  const upcomingDates = await friendsService.getUpcomingDates(user.userId, { days, limit });

  return c.json(upcomingDates);
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

  const friendsService = new FriendsService(db, logger);
  const graphData = await friendsService.getNetworkGraphData(user.userId);

  return c.json(graphData);
});

/**
 * GET /api/friends/relationship-types
 * Get all relationship types grouped by category
 */
app.get('/relationship-types', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const friendsService = new FriendsService(db, logger);
  const types = await friendsService.getRelationshipTypes();

  return c.json(types);
});

export default app;
