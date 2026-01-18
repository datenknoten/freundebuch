import {
  type ErrorResponse,
  FriendCreateSchema,
  FriendListQuerySchema,
  FriendUpdateSchema,
  parseFriendListQuery,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import { FriendsService } from '../../services/friends/index.js';
import { PhotoService } from '../../services/photo.service.js';
import type { AppContext } from '../../types/context.js';
import { isAppError, toError } from '../../utils/errors.js';

const app = new Hono<AppContext>();

/**
 * GET /api/friends
 * List friends with pagination and sorting
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const queryParams = c.req.query();
    const validated = FriendListQuerySchema(queryParams);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
    }

    const options = parseFriendListQuery(validated);
    const friendsService = new FriendsService(db, logger);
    const result = await friendsService.listFriends(user.userId, options);

    return c.json(result);
  } catch (error) {
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list friends');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to list friends');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list friends' }, 500);
  }
});

/**
 * GET /api/friends/:id
 * Get a single friend with all related data
 */
app.get('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  try {
    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.getFriendById(user.userId, friendId);

    if (!friend) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(friend);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to get friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get friend' }, 500);
  }
});

/**
 * POST /api/friends
 * Create a new friend
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = FriendCreateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.createFriend(user.userId, validated);

    return c.json(friend, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to create friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to create friend' }, 500);
  }
});

/**
 * PUT /api/friends/:id
 * Update an existing friend
 */
app.put('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = FriendUpdateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.updateFriend(user.userId, friendId, validated);

    if (!friend) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(friend);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to update friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update friend' }, 500);
  }
});

/**
 * DELETE /api/friends/:id
 * Soft delete a friend and remove associated photo files
 */
app.delete('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteFriend(user.userId, friendId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    // Delete photo files from disk (best effort - don't fail if photos don't exist)
    try {
      const photoService = new PhotoService(logger);
      await photoService.deletePhoto(friendId);
    } catch (photoError) {
      logger.warn({ error: photoError, friendId }, 'Failed to delete friend photos');
    }

    return c.json({ message: 'Friend deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to delete friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete friend' }, 500);
  }
});

export default app;
