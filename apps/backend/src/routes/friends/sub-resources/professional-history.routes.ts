import { type ErrorResponse, ProfessionalHistoryInputSchema } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { toError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/professional-history
 * Add a professional history entry to a friend
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = ProfessionalHistoryInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const history = await friendsService.addProfessionalHistory(user.userId, friendId, validated);

    if (!history) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(history, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add professional history');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add professional history' }, 500);
  }
});

/**
 * PUT /api/friends/:id/professional-history/:historyId
 * Update a professional history entry
 */
app.put('/:historyId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const historyId = c.req.param('historyId')!;

  if (!isValidUuid(friendId) || !isValidUuid(historyId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = ProfessionalHistoryInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const history = await friendsService.updateProfessionalHistory(
      user.userId,
      friendId,
      historyId,
      validated,
    );

    if (!history) {
      return c.json<ErrorResponse>({ error: 'Professional history entry not found' }, 404);
    }

    return c.json(history);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, historyId }, 'Failed to update professional history');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update professional history' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/professional-history/:historyId
 * Delete a professional history entry
 */
app.delete('/:historyId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const historyId = c.req.param('historyId')!;

  if (!isValidUuid(friendId) || !isValidUuid(historyId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteProfessionalHistory(
      user.userId,
      friendId,
      historyId,
    );

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Professional history entry not found' }, 404);
    }

    return c.json({ message: 'Professional history entry deleted' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, historyId }, 'Failed to delete professional history');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete professional history' }, 500);
  }
});

export default app;
