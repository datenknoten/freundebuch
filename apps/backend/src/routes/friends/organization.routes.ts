import { type ErrorResponse, PhotoValidationErrors } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import { CirclesService } from '../../services/circles.service.js';
import { FriendsService } from '../../services/friends/index.js';
import { PhotoService } from '../../services/photo.service.js';
import type { AppContext } from '../../types/context.js';
import { FriendNotFoundError, ValidationError } from '../../utils/errors.js';
import { isValidUuid } from '../../utils/security.js';

const app = new Hono<AppContext>();

// ============================================================================
// Photo Routes
// ============================================================================

/**
 * POST /api/friends/:id/photo
 * Upload a profile photo
 */
app.post('/:id/photo', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  // Validate friendId is a valid UUID to prevent path traversal
  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  const formData = await c.req.formData();
  const file = formData.get('photo');

  if (!file || !(file instanceof File)) {
    throw new ValidationError(PhotoValidationErrors.NO_FILE_PROVIDED);
  }

  // Verify friend exists and belongs to user
  const friendsService = new FriendsService(db, logger);
  const friend = await friendsService.getFriendById(user.userId, friendId);

  if (!friend) {
    throw new FriendNotFoundError();
  }

  // Upload photo
  const photoService = new PhotoService(logger);
  const result = await photoService.uploadPhoto(friendId, file);

  // Update friend with photo URLs
  // If DB update fails, clean up the uploaded files to prevent orphaned files
  try {
    await friendsService.updatePhoto(
      user.userId,
      friendId,
      result.photoUrl,
      result.photoThumbnailUrl,
    );
  } catch (dbError) {
    // Clean up uploaded files since DB update failed
    logger.warn({ friendId }, 'DB update failed, cleaning up uploaded photo');
    try {
      await photoService.deletePhoto(friendId);
    } catch (cleanupError) {
      logger.error({ cleanupError, friendId }, 'Failed to clean up photo after DB error');
    }
    throw dbError;
  }

  return c.json(result, 201);
});

/**
 * DELETE /api/friends/:id/photo
 * Delete a profile photo
 */
app.delete('/:id/photo', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  // Validate friendId is a valid UUID to prevent path traversal
  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  const friendsService = new FriendsService(db, logger);
  const friend = await friendsService.getFriendById(user.userId, friendId);

  if (!friend) {
    throw new FriendNotFoundError();
  }

  // Delete photo files
  const photoService = new PhotoService(logger);
  await photoService.deletePhoto(friendId);

  // Clear photo URLs from friend
  await friendsService.updatePhoto(user.userId, friendId, null, null);

  return c.json({ message: 'Photo deleted successfully' });
});

// ============================================================================
// Circle Assignment Routes
// ============================================================================

/**
 * GET /api/friends/:id/circles
 * Get all circles for a friend
 */
app.get('/:id/circles', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  const circlesService = new CirclesService(db);
  const circles = await circlesService.getCirclesForFriend(user.userId, friendId);

  return c.json(circles);
});

/**
 * PUT /api/friends/:id/circles
 * Set circles for a friend (replaces all existing circle assignments)
 */
const SetCirclesInputSchema = type({
  circle_ids: 'string[]',
});

app.put('/:id/circles', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = SetCirclesInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  // Validate all circle IDs are valid UUIDs
  for (const circleId of validated.circle_ids) {
    if (!isValidUuid(circleId)) {
      throw new ValidationError(`Invalid circle ID: ${circleId}`);
    }
  }

  const circlesService = new CirclesService(db);
  const circles = await circlesService.setFriendCircles(
    user.userId,
    friendId,
    validated.circle_ids,
  );

  return c.json(circles);
});

/**
 * POST /api/friends/:id/circles/:circleId
 * Add friend to a circle
 */
app.post('/:id/circles/:circleId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const circleId = c.req.param('circleId');

  if (!isValidUuid(friendId) || !isValidUuid(circleId)) {
    throw new ValidationError('Invalid ID');
  }

  const circlesService = new CirclesService(db);
  const circle = await circlesService.addFriendToCircle(user.userId, friendId, circleId);

  if (!circle) {
    return c.json<ErrorResponse>({ error: 'Friend or circle not found' }, 404);
  }

  return c.json(circle, 201);
});

/**
 * DELETE /api/friends/:id/circles/:circleId
 * Remove friend from a circle
 */
app.delete('/:id/circles/:circleId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const circleId = c.req.param('circleId');

  if (!isValidUuid(friendId) || !isValidUuid(circleId)) {
    throw new ValidationError('Invalid ID');
  }

  const circlesService = new CirclesService(db);
  const removed = await circlesService.removeFriendFromCircle(user.userId, friendId, circleId);

  if (!removed) {
    return c.json<ErrorResponse>({ error: 'Friend-circle assignment not found' }, 404);
  }

  return c.json({ message: 'Friend removed from circle successfully' });
});

// ============================================================================
// Favorites & Archive Routes
// ============================================================================

/**
 * POST /api/friends/:id/favorite
 * Toggle the favorite status of a friend
 */
app.post('/:id/favorite', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  const friendsService = new FriendsService(db, logger);
  const isFavorite = await friendsService.toggleFavorite(user.userId, friendId);

  if (isFavorite === null) {
    throw new FriendNotFoundError();
  }

  return c.json({ is_favorite: isFavorite });
});

/**
 * POST /api/friends/:id/archive
 * Archive a friend
 */
const ArchiveInputSchema = type({
  'reason?': 'string',
});

app.post('/:id/archive', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  let body: unknown = {};
  try {
    const text = await c.req.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = ArchiveInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, logger);
  const archived = await friendsService.archiveFriend(user.userId, friendId, validated.reason);

  if (!archived) {
    return c.json<ErrorResponse>({ error: 'Friend not found or already archived' }, 404);
  }

  return c.json({ message: 'Friend archived successfully' });
});

/**
 * POST /api/friends/:id/unarchive
 * Unarchive a friend (restore from archive)
 */
app.post('/:id/unarchive', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  const friendsService = new FriendsService(db, logger);
  const unarchived = await friendsService.unarchiveFriend(user.userId, friendId);

  if (!unarchived) {
    return c.json<ErrorResponse>({ error: 'Friend not found or not archived' }, 404);
  }

  return c.json({ message: 'Friend unarchived successfully' });
});

export default app;
