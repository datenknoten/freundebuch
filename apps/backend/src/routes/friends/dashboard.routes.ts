import { Hono } from 'hono';
import { etag } from 'hono/etag';
import { getAuthUser } from '../../middleware/auth.js';
import { FriendsService } from '../../services/friends/index.js';
import type { AppContext } from '../../types/context.js';

const app = new Hono<AppContext>();

// Emit ETags so browsers can revalidate dashboard/graph responses cheaply
// (304 Not Modified) on warm navigations and back/forward, without ever
// serving stale data — these payloads change whenever friends or
// relationships do.
app.use('/dashboard', etag());
app.use('/network-graph', etag());

/** Clamp the `days` query param to a sane range (default 30). */
function parseDays(value: string | undefined): number {
  return value ? Math.min(365, Math.max(1, Number.parseInt(value, 10) || 30)) : 30;
}

/** Clamp the `limit` query param to a sane range (default 10). */
function parseLimit(value: string | undefined): number {
  return value ? Math.min(50, Math.max(1, Number.parseInt(value, 10) || 10)) : 10;
}

/**
 * GET /api/friends/dates/upcoming
 * Get upcoming important dates across all friends
 * Query params: days (default 30), limit (default 10)
 */
app.get('/dates/upcoming', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const days = parseDays(c.req.query('days'));
  const limit = parseLimit(c.req.query('limit'));

  const friendsService = new FriendsService(db, logger);
  const upcomingDates = await friendsService.getUpcomingDates(user.userId, { days, limit });

  return c.json(upcomingDates);
});

/**
 * GET /api/friends/dashboard
 * Consolidated dashboard payload: upcoming dates + network graph in one request.
 * Query params: days (default 30), limit (default 10) — applied to upcoming dates.
 */
app.get('/dashboard', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const days = parseDays(c.req.query('days'));
  const limit = parseLimit(c.req.query('limit'));

  const friendsService = new FriendsService(db, logger);
  const [upcomingDates, networkGraph] = await Promise.all([
    friendsService.getUpcomingDates(user.userId, { days, limit }),
    friendsService.getNetworkGraphData(user.userId),
  ]);

  return c.json({ upcomingDates, networkGraph });
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
