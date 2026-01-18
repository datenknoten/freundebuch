import { type ErrorResponse, MetInfoInputSchema } from '@freundebuch/shared/index.js';
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
 * PUT /api/friends/:id/met-info
 * Set or update how/where met information (upsert)
 */
app.put('/', async (c) => {
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

    const validated = MetInfoInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const metInfo = await friendsService.setMetInfo(user.userId, friendId, validated);

    if (!metInfo) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(metInfo);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to set met info');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to set met info' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/met-info
 * Delete how/where met information
 */
app.delete('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteMetInfo(user.userId, friendId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Met info not found' }, 404);
    }

    return c.json({ message: 'Met info deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to delete met info');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete met info' }, 500);
  }
});

export default app;
