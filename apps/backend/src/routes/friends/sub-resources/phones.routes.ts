import { type ErrorResponse, PhoneInputSchema } from '@freundebuch/shared/index.js';
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
 * POST /api/friends/:id/phones
 * Add a phone number to a friend
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

    const validated = PhoneInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const phone = await friendsService.addPhone(user.userId, friendId, validated);

    if (!phone) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(phone, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add phone');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add phone' }, 500);
  }
});

/**
 * PUT /api/friends/:id/phones/:phoneId
 * Update a phone number
 */
app.put('/:phoneId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const phoneId = c.req.param('phoneId')!;

  if (!isValidUuid(friendId) || !isValidUuid(phoneId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = PhoneInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const phone = await friendsService.updatePhone(user.userId, friendId, phoneId, validated);

    if (!phone) {
      return c.json<ErrorResponse>({ error: 'Phone not found' }, 404);
    }

    return c.json(phone);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, phoneId }, 'Failed to update phone');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update phone' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/phones/:phoneId
 * Delete a phone number
 */
app.delete('/:phoneId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const phoneId = c.req.param('phoneId')!;

  if (!isValidUuid(friendId) || !isValidUuid(phoneId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deletePhone(user.userId, friendId, phoneId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Phone not found' }, 404);
    }

    return c.json({ message: 'Phone deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, phoneId }, 'Failed to delete phone');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete phone' }, 500);
  }
});

export default app;
