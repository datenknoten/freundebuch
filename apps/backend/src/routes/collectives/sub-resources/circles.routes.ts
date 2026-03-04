import type { ErrorResponse } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveCircleService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { ValidationError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * GET /api/collectives/:id/circles
 * Get all circles a collective belongs to
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const circleService = new CollectiveCircleService({ db, logger });
  const circles = await circleService.getCircles(user.userId, collectiveId);

  return c.json(circles);
});

/**
 * GET /api/collectives/:id/circles/available
 * Get available circles (not already assigned to collective)
 */
app.get('/available', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const circleService = new CollectiveCircleService({ db, logger });
  const circles = await circleService.getAvailableCircles(user.userId, collectiveId);

  return c.json(circles);
});

/**
 * POST /api/collectives/:id/circles/:circleId
 * Add collective to a circle
 */
app.post('/:circleId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';
  const circleId = c.req.param('circleId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(circleId)) {
    throw new ValidationError('Invalid ID');
  }

  const circleService = new CollectiveCircleService({ db, logger });
  const added = await circleService.addToCircle(user.userId, collectiveId, circleId);

  if (!added) {
    throw new ValidationError('Failed to add collective to circle');
  }

  return c.json({ message: 'Collective added to circle successfully' }, 201);
});

/**
 * DELETE /api/collectives/:id/circles/:circleId
 * Remove collective from a circle
 */
app.delete('/:circleId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';
  const circleId = c.req.param('circleId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(circleId)) {
    throw new ValidationError('Invalid ID');
  }

  const circleService = new CollectiveCircleService({ db, logger });
  const removed = await circleService.removeFromCircle(user.userId, collectiveId, circleId);

  if (!removed) {
    return c.json<ErrorResponse>({ error: 'Circle membership not found' }, 404);
  }

  return c.json({ message: 'Collective removed from circle successfully' });
});

export default app;
