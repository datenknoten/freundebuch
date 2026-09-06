import {
  CircleInputSchema,
  CircleMergeSchema,
  CircleReorderSchema,
} from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { etag } from 'hono/etag';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { circlesRateLimitMiddleware } from '../middleware/rate-limit.js';
import { CirclesService } from '../services/circles.service.js';
import type { AppContext } from '../types/context.js';
import { CircleCreationError, CircleNotFoundError, ValidationError } from '../utils/errors.js';
import { parseBody, requireUuidParam } from '../utils/http.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all circle routes
app.use('*', authMiddleware);
// Apply rate limiting to prevent abuse
app.use('*', circlesRateLimitMiddleware);
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
  const db = c.get('db');
  const user = getAuthUser(c);

  const circlesService = new CirclesService(db);
  const circles = await circlesService.listCircles(user.userId);

  return c.json(circles);
});

/**
 * POST /api/circles
 * Create a new circle
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);

  const validated = await parseBody(c, CircleInputSchema);

  const circlesService = new CirclesService(db);
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
  const db = c.get('db');
  const user = getAuthUser(c);

  const validated = await parseBody(c, CircleReorderSchema);

  const circlesService = new CirclesService(db);
  await circlesService.reorderCircles(user.userId, validated.order);

  return c.json({ success: true });
});

/**
 * GET /api/circles/:id
 * Get a single circle by ID
 */
app.get('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const circleId = requireUuidParam(c, 'id', 'circle ID');

  const circlesService = new CirclesService(db);
  const circle = await circlesService.getCircleById(user.userId, circleId);

  if (!circle) {
    throw new CircleNotFoundError();
  }

  return c.json(circle);
});

/**
 * PUT /api/circles/:id
 * Update a circle
 */
app.put('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const circleId = requireUuidParam(c, 'id', 'circle ID');
  const validated = await parseBody(c, CircleInputSchema);

  const circlesService = new CirclesService(db);
  const circle = await circlesService.updateCircle(user.userId, circleId, validated);

  if (!circle) {
    throw new CircleNotFoundError();
  }

  return c.json(circle);
});

/**
 * DELETE /api/circles/:id
 * Delete a circle (friends remain, just unassigned from this circle)
 */
app.delete('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const circleId = requireUuidParam(c, 'id', 'circle ID');

  const circlesService = new CirclesService(db);
  const deleted = await circlesService.deleteCircle(user.userId, circleId);

  if (!deleted) {
    throw new CircleNotFoundError();
  }

  return c.json({ success: true });
});

/**
 * POST /api/circles/:id/merge
 * Merge another circle into this one (move all friends from source, then delete source)
 */
app.post('/:id/merge', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const targetCircleId = requireUuidParam(c, 'id', 'target circle ID');
  const validated = await parseBody(c, CircleMergeSchema);

  if (targetCircleId === validated.source_circle_id) {
    throw new ValidationError('Cannot merge a circle into itself');
  }

  const circlesService = new CirclesService(db);
  const circle = await circlesService.mergeCircles(
    user.userId,
    targetCircleId,
    validated.source_circle_id,
  );

  if (!circle) {
    throw new CircleNotFoundError();
  }

  return c.json(circle);
});

export default app;
