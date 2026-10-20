import { Hono } from 'hono';
import { etag } from 'hono/etag';
import { getAuthUser } from '../../middleware/auth.js';
import type { FriendsService } from '../../services/friends/friends.service.js';
import type { AppContext } from '../../types/context.js';

/** Clamp the `days` query param to a sane range (default 30). */
function parseDays(value: string | undefined): number {
  if (value === undefined) return 30;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 30 : Math.min(365, Math.max(1, parsed));
}

/** Clamp the `limit` query param to a sane range (default 10). */
function parseLimit(value: string | undefined): number {
  if (value === undefined) return 10;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 10 : Math.min(50, Math.max(1, parsed));
}

export interface DashboardRoutesOptions {
  friendsService: FriendsService;
}

export function createDashboardRoutes(options: DashboardRoutesOptions): Hono<AppContext> {
  const app = new Hono<AppContext>();

  // Emit ETags so browsers can revalidate dashboard/graph responses cheaply
  // (304 Not Modified) on warm navigations and back/forward, without ever
  // serving stale data — these payloads change whenever friends or
  // relationships do.
  app.use('/dashboard', etag());
  app.use('/network-graph', etag());

  /**
   * GET /api/friends/dates/upcoming
   * Get upcoming important dates across all friends
   * Query params: days (default 30), limit (default 10)
   */
  app.get('/dates/upcoming', async (c) => {
    const user = getAuthUser(c);

    const days = parseDays(c.req.query('days'));
    const limit = parseLimit(c.req.query('limit'));

    const upcomingDates = await options.friendsService.getUpcomingDates(user.userId, {
      days,
      limit,
    });

    return c.json(upcomingDates);
  });

  /**
   * GET /api/friends/dashboard
   * Consolidated dashboard payload: upcoming dates + network graph in one request.
   * Query params: days (default 30), limit (default 10) — applied to upcoming dates.
   */
  app.get('/dashboard', async (c) => {
    const user = getAuthUser(c);

    const days = parseDays(c.req.query('days'));
    const limit = parseLimit(c.req.query('limit'));

    const [upcomingDates, networkGraph] = await Promise.all([
      options.friendsService.getUpcomingDates(user.userId, { days, limit }),
      options.friendsService.getNetworkGraphData(user.userId),
    ]);

    return c.json({ upcomingDates, networkGraph });
  });

  /**
   * GET /api/friends/network-graph
   * Get network graph data for visualization
   * Returns all non-archived friends as nodes and their relationships as links
   */
  app.get('/network-graph', async (c) => {
    const user = getAuthUser(c);

    const graphData = await options.friendsService.getNetworkGraphData(user.userId);

    return c.json(graphData);
  });

  /**
   * GET /api/friends/relationship-types
   * Get all relationship types grouped by category
   */
  app.get('/relationship-types', async (c) => {
    const types = await options.friendsService.getRelationshipTypes();

    return c.json(types);
  });

  return app;
}
