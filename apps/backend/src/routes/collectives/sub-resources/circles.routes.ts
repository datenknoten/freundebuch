import type { ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveCircleService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { isAppError, toError } from '../../../utils/errors.js';
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
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const circleService = new CollectiveCircleService({ db, logger });
    const circles = await circleService.getCircles(user.userId, collectiveId);

    return c.json(circles);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get circles for collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to get circles for collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get circles' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const circleService = new CollectiveCircleService({ db, logger });
    const circles = await circleService.getAvailableCircles(user.userId, collectiveId);

    return c.json(circles);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get available circles');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to get available circles');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get available circles' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const circleService = new CollectiveCircleService({ db, logger });
    const added = await circleService.addToCircle(user.userId, collectiveId, circleId);

    if (!added) {
      return c.json<ErrorResponse>({ error: 'Failed to add collective to circle' }, 400);
    }

    return c.json({ message: 'Collective added to circle successfully' }, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to add collective to circle');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, circleId }, 'Failed to add collective to circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add to circle' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const circleService = new CollectiveCircleService({ db, logger });
    const removed = await circleService.removeFromCircle(user.userId, collectiveId, circleId);

    if (!removed) {
      return c.json<ErrorResponse>({ error: 'Circle membership not found' }, 404);
    }

    return c.json({ message: 'Collective removed from circle successfully' });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to remove collective from circle');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, circleId }, 'Failed to remove collective from circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to remove from circle' }, 500);
  }
});

export default app;
