import { CircleInputSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { circlesRateLimitMiddleware } from '../middleware/rate-limit.js';
import { CirclesService } from '../services/circles.service.js';
import type { AppContext } from '../types/context.js';
import { CircleNotFoundError, ValidationError } from '../utils/errors.js';
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

  const body = await c.req.json();
  const validated = CircleInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  const circlesService = new CirclesService(db);
  const circle = await circlesService.createCircle(user.userId, validated);

  if (!circle) {
    throw new Error('Failed to create circle');
  }

  return c.json(circle, 201);
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
  const db = c.get('db');
  const user = getAuthUser(c);

  const body = await c.req.json();
  const validated = ReorderInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  // Validate all IDs are valid UUIDs
  for (const item of validated.order) {
    if (!isValidUuid(item.id)) {
      throw new ValidationError(`Invalid circle ID: ${item.id}`);
    }
  }

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
  const circleId = c.req.param('id');

  if (!isValidUuid(circleId)) {
    throw new ValidationError('Invalid circle ID');
  }

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
  const circleId = c.req.param('id');

  if (!isValidUuid(circleId)) {
    throw new ValidationError('Invalid circle ID');
  }

  const body = await c.req.json();
  const validated = CircleInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

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
  const circleId = c.req.param('id');

  if (!isValidUuid(circleId)) {
    throw new ValidationError('Invalid circle ID');
  }

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
const MergeInputSchema = type({
  source_circle_id: 'string',
});

app.post('/:id/merge', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const targetCircleId = c.req.param('id');

  if (!isValidUuid(targetCircleId)) {
    throw new ValidationError('Invalid target circle ID');
  }

  const body = await c.req.json();
  const validated = MergeInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  if (!isValidUuid(validated.source_circle_id)) {
    throw new ValidationError('Invalid source circle ID');
  }

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
