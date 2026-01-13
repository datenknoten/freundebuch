import { CircleInputSchema, type ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { circlesRateLimitMiddleware } from '../middleware/rate-limit.js';
import { CirclesService } from '../services/circles.service.js';
import type { AppContext } from '../types/context.js';
import { isAppError, toError } from '../utils/errors.js';
import { isValidUuid } from '../utils/security.js';

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
 * List all circles for the authenticated user
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const circlesService = new CirclesService(db);
    const circles = await circlesService.listCircles(user.userId);

    return c.json(circles);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list circles');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to list circles');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list circles' }, 500);
  }
});

/**
 * POST /api/circles
 * Create a new circle
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const body = await c.req.json();
    const validated = CircleInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    const circlesService = new CirclesService(db);
    const circle = await circlesService.createCircle(user.userId, validated);

    if (!circle) {
      return c.json<ErrorResponse>({ error: 'Failed to create circle' }, 500);
    }

    return c.json(circle, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to create circle');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to create circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to create circle' }, 500);
  }
});

/**
 * PUT /api/circles/reorder
 * Batch reorder circles by updating their sort_order
 * NOTE: This must be defined before /:id to avoid being caught by the wildcard
 */
const ReorderInputSchema = type({
  order: type({ id: 'string', sort_order: 'number' }).array(),
});

app.put('/reorder', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const body = await c.req.json();
    const validated = ReorderInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    // Validate all IDs are valid UUIDs
    for (const item of validated.order) {
      if (!isValidUuid(item.id)) {
        return c.json<ErrorResponse>({ error: `Invalid circle ID: ${item.id}` }, 400);
      }
    }

    const circlesService = new CirclesService(db);
    await circlesService.reorderCircles(user.userId, validated.order);

    return c.json({ success: true });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to reorder circles');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to reorder circles');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to reorder circles' }, 500);
  }
});

/**
 * GET /api/circles/:id
 * Get a single circle by ID
 */
app.get('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const circleId = c.req.param('id');

  if (!isValidUuid(circleId)) {
    return c.json<ErrorResponse>({ error: 'Invalid circle ID' }, 400);
  }

  try {
    const circlesService = new CirclesService(db);
    const circle = await circlesService.getCircleById(user.userId, circleId);

    if (!circle) {
      return c.json<ErrorResponse>({ error: 'Circle not found' }, 404);
    }

    return c.json(circle);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get circle');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, circleId }, 'Failed to get circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get circle' }, 500);
  }
});

/**
 * PUT /api/circles/:id
 * Update a circle
 */
app.put('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const circleId = c.req.param('id');

  if (!isValidUuid(circleId)) {
    return c.json<ErrorResponse>({ error: 'Invalid circle ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const validated = CircleInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    const circlesService = new CirclesService(db);
    const circle = await circlesService.updateCircle(user.userId, circleId, validated);

    if (!circle) {
      return c.json<ErrorResponse>({ error: 'Circle not found' }, 404);
    }

    return c.json(circle);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update circle');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, circleId }, 'Failed to update circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update circle' }, 500);
  }
});

/**
 * DELETE /api/circles/:id
 * Delete a circle (friends remain, just unassigned from this circle)
 */
app.delete('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const circleId = c.req.param('id');

  if (!isValidUuid(circleId)) {
    return c.json<ErrorResponse>({ error: 'Invalid circle ID' }, 400);
  }

  try {
    const circlesService = new CirclesService(db);
    const deleted = await circlesService.deleteCircle(user.userId, circleId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Circle not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to delete circle');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, circleId }, 'Failed to delete circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete circle' }, 500);
  }
});

/**
 * POST /api/circles/:id/merge
 * Merge another circle into this one (move all friends from source, then delete source)
 */
const MergeInputSchema = type({
  source_circle_id: 'string',
});

app.post('/:id/merge', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const targetCircleId = c.req.param('id');

  if (!isValidUuid(targetCircleId)) {
    return c.json<ErrorResponse>({ error: 'Invalid target circle ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const validated = MergeInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    if (!isValidUuid(validated.source_circle_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid source circle ID' }, 400);
    }

    if (targetCircleId === validated.source_circle_id) {
      return c.json<ErrorResponse>({ error: 'Cannot merge a circle into itself' }, 400);
    }

    const circlesService = new CirclesService(db);
    const circle = await circlesService.mergeCircles(
      user.userId,
      targetCircleId,
      validated.source_circle_id,
    );

    if (!circle) {
      return c.json<ErrorResponse>({ error: 'Circle not found' }, 404);
    }

    return c.json(circle);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to merge circles');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, targetCircleId }, 'Failed to merge circles');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to merge circles' }, 500);
  }
});

export default app;
