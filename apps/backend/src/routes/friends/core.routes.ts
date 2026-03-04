import {
  FriendCreateSchema,
  FriendListQuerySchema,
  FriendUpdateSchema,
  parseFriendListQuery,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import { FriendsService } from '../../services/friends/index.js';
import { PhotoService } from '../../services/photo.service.js';
import type { AppContext } from '../../types/context.js';
import { FriendNotFoundError, ValidationError } from '../../utils/errors.js';

const app = new Hono<AppContext>();

/**
 * GET /api/friends
 * List friends with pagination and sorting
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  const queryParams = c.req.query();
  const validated = FriendListQuerySchema(queryParams);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  const options = parseFriendListQuery(validated);
  const friendsService = new FriendsService(db, logger);
  const result = await friendsService.listFriends(user.userId, options);

  return c.json(result);
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

  const friendsService = new FriendsService(db, logger);
  const friend = await friendsService.getFriendById(user.userId, friendId);

  if (!friend) {
    throw new FriendNotFoundError();
  }

  return c.json(friend);
});

/**
 * POST /api/friends
 * Create a new friend
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = FriendCreateSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, logger);
  const friend = await friendsService.createFriend(user.userId, validated);

  return c.json(friend, 201);
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

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = FriendUpdateSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, logger);
  const friend = await friendsService.updateFriend(user.userId, friendId, validated);

  if (!friend) {
    throw new FriendNotFoundError();
  }

  return c.json(friend);
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

  const friendsService = new FriendsService(db, logger);
  const deleted = await friendsService.deleteFriend(user.userId, friendId);

  if (!deleted) {
    throw new FriendNotFoundError();
  }

  // Delete photo files from disk (best effort - don't fail if photos don't exist)
  try {
    const photoService = new PhotoService(logger);
    await photoService.deletePhoto(friendId);
  } catch (photoError) {
    logger.warn({ error: photoError, friendId }, 'Failed to delete friend photos');
  }

  return c.json({ message: 'Friend deleted successfully' });
});

export default app;
