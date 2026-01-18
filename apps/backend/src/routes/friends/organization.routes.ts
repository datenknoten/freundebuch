import { type ErrorResponse, PhotoValidationErrors } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import { CirclesService } from '../../services/circles.service.js';
import { FriendsService } from '../../services/friends/index.js';
import { PhotoService, PhotoUploadError } from '../../services/photo.service.js';
import type { AppContext } from '../../types/context.js';
import { toError } from '../../utils/errors.js';
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
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('photo');

    if (!file || !(file instanceof File)) {
      return c.json<ErrorResponse>({ error: PhotoValidationErrors.NO_FILE_PROVIDED }, 400);
    }

    // Verify friend exists and belongs to user
    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.getFriendById(user.userId, friendId);

    if (!friend) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
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
  } catch (error) {
    if (error instanceof PhotoUploadError) {
      return c.json<ErrorResponse>({ error: error.message }, 400);
    }

    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to upload photo');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to upload photo' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const friend = await friendsService.getFriendById(user.userId, friendId);

    if (!friend) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    // Delete photo files
    const photoService = new PhotoService(logger);
    await photoService.deletePhoto(friendId);

    // Clear photo URLs from friend
    await friendsService.updatePhoto(user.userId, friendId, null, null);

    return c.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to delete photo');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete photo' }, 500);
  }
});

// ============================================================================
// Circle Assignment Routes
// ============================================================================

/**
 * GET /api/friends/:id/circles
 * Get all circles for a friend
 */
app.get('/:id/circles', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const circlesService = new CirclesService(db);
    const circles = await circlesService.getCirclesForFriend(user.userId, friendId);

    return c.json(circles);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to get friend circles');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get friend circles' }, 500);
  }
});

/**
 * PUT /api/friends/:id/circles
 * Set circles for a friend (replaces all existing circle assignments)
 */
const SetCirclesInputSchema = type({
  circle_ids: 'string[]',
});

app.put('/:id/circles', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');

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

    const validated = SetCirclesInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    // Validate all circle IDs are valid UUIDs
    for (const circleId of validated.circle_ids) {
      if (!isValidUuid(circleId)) {
        return c.json<ErrorResponse>({ error: `Invalid circle ID: ${circleId}` }, 400);
      }
    }

    const circlesService = new CirclesService(db);
    const circles = await circlesService.setFriendCircles(
      user.userId,
      friendId,
      validated.circle_ids,
    );

    return c.json(circles);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to set friend circles');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to set friend circles' }, 500);
  }
});

/**
 * POST /api/friends/:id/circles/:circleId
 * Add friend to a circle
 */
app.post('/:id/circles/:circleId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const circleId = c.req.param('circleId');

  if (!isValidUuid(friendId) || !isValidUuid(circleId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const circlesService = new CirclesService(db);
    const circle = await circlesService.addFriendToCircle(user.userId, friendId, circleId);

    if (!circle) {
      return c.json<ErrorResponse>({ error: 'Friend or circle not found' }, 404);
    }

    return c.json(circle, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, circleId }, 'Failed to add friend to circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add friend to circle' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/circles/:circleId
 * Remove friend from a circle
 */
app.delete('/:id/circles/:circleId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id');
  const circleId = c.req.param('circleId');

  if (!isValidUuid(friendId) || !isValidUuid(circleId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const circlesService = new CirclesService(db);
    const removed = await circlesService.removeFriendFromCircle(user.userId, friendId, circleId);

    if (!removed) {
      return c.json<ErrorResponse>({ error: 'Friend-circle assignment not found' }, 404);
    }

    return c.json({ message: 'Friend removed from circle successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, circleId }, 'Failed to remove friend from circle');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to remove friend from circle' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const isFavorite = await friendsService.toggleFavorite(user.userId, friendId);

    if (isFavorite === null) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json({ is_favorite: isFavorite });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to toggle favorite');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to toggle favorite' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    let body: unknown = {};
    try {
      const text = await c.req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = ArchiveInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const archived = await friendsService.archiveFriend(user.userId, friendId, validated.reason);

    if (!archived) {
      return c.json<ErrorResponse>({ error: 'Friend not found or already archived' }, 404);
    }

    return c.json({ message: 'Friend archived successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to archive friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to archive friend' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const unarchived = await friendsService.unarchiveFriend(user.userId, friendId);

    if (!unarchived) {
      return c.json<ErrorResponse>({ error: 'Friend not found or not archived' }, 404);
    }

    return c.json({ message: 'Friend unarchived successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to unarchive friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to unarchive friend' }, 500);
  }
});

export default app;
