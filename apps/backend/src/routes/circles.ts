import { ValidationError } from '@datenknoten/kit';
import {
  CircleInputSchema,
  CircleMergeInputSchema,
  CircleReorderInputSchema,
} from '@freundebuch/shared/index.js';
import { Hono, type MiddlewareHandler } from 'hono';
import { etag } from 'hono/etag';
import { CircleCreationError } from '../errors/circle-creation.error.js';
import { CircleNotFoundError } from '../errors/circle-not-found.error.js';
import { getAuthUser } from '../middleware/auth.js';
import type { CirclesService } from '../services/circles.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

export interface CirclesRoutesOptions {
  circlesService: CirclesService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createCirclesRoutes(options: CirclesRoutesOptions) {
  const { circlesService, authMiddleware, onboardingMiddleware, rateLimitMiddleware } = options;
  const app = new Hono<AppContext>();

  // Apply auth middleware to all circle routes
  app.use('*', authMiddleware);
  // Apply rate limiting to prevent abuse
  app.use('*', rateLimitMiddleware);
  // Apply onboarding middleware to require self-friend before using circles
  app.use('*', onboardingMiddleware);

  // ============================================================================
  // Circle CRUD Routes
  // ============================================================================

  /**
   * GET /api/circles
   * List all circles for the authenticated user.
   * Emits an ETag so warm reloads can revalidate cheaply (304) without
   * serving stale data.
   */
  app.get('/', etag(), async (c) => {
    const user = getAuthUser(c);
    const circles = await circlesService.listCircles(user.userId);

    return c.json(circles);
  });

  /**
   * POST /api/circles
   * Create a new circle
   */
  app.post('/', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, CircleInputSchema);
    const circle = await circlesService.createCircle(user.userId, validated);

    if (!circle) {
      throw new CircleCreationError();
    }

    return c.json(circle, 201);
  });

  /**
   * PUT /api/circles/reorder
   * Batch reorder circles by updating their sort_order
   * NOTE: This must be defined before /:id to avoid being caught by the wildcard
   */
  app.put('/reorder', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, CircleReorderInputSchema);
    await circlesService.reorderCircles(user.userId, validated.order);

    return c.json({ success: true });
  });

  /**
   * GET /api/circles/:id
   * Get a single circle by ID
   */
  app.get('/:id', async (c) => {
    const user = getAuthUser(c);
    const circleId = requireUuidParam(c, 'id', 'circle ID');
    const circle = await circlesService.getCircleById(user.userId, circleId);

    if (!circle) {
      throw new CircleNotFoundError(circleId);
    }

    return c.json(circle);
  });

  /**
   * PUT /api/circles/:id
   * Update a circle
   */
  app.put('/:id', async (c) => {
    const user = getAuthUser(c);
    const circleId = requireUuidParam(c, 'id', 'circle ID');
    const validated = await parseBody(c, CircleInputSchema);
    const circle = await circlesService.updateCircle(user.userId, circleId, validated);

    if (!circle) {
      throw new CircleNotFoundError(circleId);
    }

    return c.json(circle);
  });

  /**
   * DELETE /api/circles/:id
   * Delete a circle (friends remain, just unassigned from this circle)
   */
  app.delete('/:id', async (c) => {
    const user = getAuthUser(c);
    const circleId = requireUuidParam(c, 'id', 'circle ID');
    const isDeleted = await circlesService.deleteCircle(user.userId, circleId);

    if (!isDeleted) {
      throw new CircleNotFoundError(circleId);
    }

    return c.json({ success: true });
  });

  /**
   * POST /api/circles/:id/merge
   * Merge another circle into this one (move all friends from source, then delete source)
   */
  app.post('/:id/merge', async (c) => {
    const user = getAuthUser(c);
    const targetCircleId = requireUuidParam(c, 'id', 'target circle ID');
    const validated = await parseBody(c, CircleMergeInputSchema);

    if (targetCircleId === validated.source_circle_id) {
      throw new ValidationError('Cannot merge a circle into itself');
    }
    const circle = await circlesService.mergeCircles(
      user.userId,
      targetCircleId,
      validated.source_circle_id,
    );

    if (!circle) {
      throw new CircleNotFoundError(targetCircleId);
    }

    return c.json(circle);
  });

  return app;
}
