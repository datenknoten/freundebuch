import { DateInputSchema, type ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { BirthdayAlreadyExistsError, toError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/dates
 * Add an important date to a friend
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

    const validated = DateInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const date = await friendsService.addDate(user.userId, friendId, validated);

    if (!date) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(date, 201);
  } catch (error) {
    if (error instanceof BirthdayAlreadyExistsError) {
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add date');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add date' }, 500);
  }
});

/**
 * PUT /api/friends/:id/dates/:dateId
 * Update an important date
 */
app.put('/:dateId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const dateId = c.req.param('dateId')!;

  if (!isValidUuid(friendId) || !isValidUuid(dateId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = DateInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const date = await friendsService.updateDate(user.userId, friendId, dateId, validated);

    if (!date) {
      return c.json<ErrorResponse>({ error: 'Date not found' }, 404);
    }

    return c.json(date);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, dateId }, 'Failed to update date');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update date' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/dates/:dateId
 * Delete an important date
 */
app.delete('/:dateId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const dateId = c.req.param('dateId')!;

  if (!isValidUuid(friendId) || !isValidUuid(dateId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteDate(user.userId, friendId, dateId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Date not found' }, 404);
    }

    return c.json({ message: 'Date deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, dateId }, 'Failed to delete date');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete date' }, 500);
  }
});

export default app;
