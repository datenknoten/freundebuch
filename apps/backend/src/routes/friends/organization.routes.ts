import {
  ArchiveFriendSchema,
  MAX_FILE_SIZE,
  PhotoValidationErrors,
  SetFriendCirclesSchema,
} from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getAuthUser } from '../../middleware/auth.js';
import { CirclesService } from '../../services/circles.service.js';
import { FriendsService } from '../../services/friends/index.js';
import { PhotoService } from '../../services/photo.service.js';
import type { AppContext } from '../../types/context.js';
import { FriendNotFoundError, ResourceNotFoundError, ValidationError } from '../../utils/errors.js';
import { parseBody, requireUuidParam, validate } from '../../utils/http.js';

const app = new Hono<AppContext>();

// ============================================================================
// Photo Routes
// ============================================================================

/**
 * POST /api/friends/:id/photo
 * Upload a profile photo
 */
app.post(
  '/:id/photo',
  // Reject oversized bodies before buffering them; the service-level size check
  // only fires after the whole file is already in memory. The slack covers the
  // multipart envelope around a MAX_FILE_SIZE payload.
  bodyLimit({
    maxSize: MAX_FILE_SIZE + 64 * 1024,
    onError: (c) => c.json({ error: PhotoValidationErrors.FILE_TOO_LARGE }, 413),
  }),
  async (c) => {
    const logger = c.get('logger');
    const db = c.get('db');
    const user = getAuthUser(c);
    // UUID-validated to prevent path traversal
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const formData = await c.req.formData();
    const file = formData.get('photo');

    if (!file || !(file instanceof File)) {
      throw new ValidationError(PhotoValidationErrors.NO_FILE_PROVIDED);
    }

    // Verify friend exists and belongs to user
    const friendsService = new FriendsService({ db: db, logger: logger });
    const friend = await friendsService.getFriendById(user.userId, friendId);

    if (!friend) {
      throw new FriendNotFoundError();
    }

    // Upload photo
    const photoService = new PhotoService({ logger: logger });
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
  },
);

/**
 * DELETE /api/friends/:id/photo
 * Delete a profile photo
 */
app.delete('/:id/photo', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  // UUID-validated to prevent path traversal
  const friendId = requireUuidParam(c, 'id', 'friend ID');

  const friendsService = new FriendsService({ db: db, logger: logger });
  const friend = await friendsService.getFriendById(user.userId, friendId);

  if (!friend) {
    throw new FriendNotFoundError();
  }

  // Delete photo files
  const photoService = new PhotoService({ logger: logger });
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
  const friendId = requireUuidParam(c, 'id', 'friend ID');

  const circlesService = new CirclesService({ db: db });
  const circles = await circlesService.getCirclesForFriend(user.userId, friendId);

  return c.json(circles);
});

/**
 * PUT /api/friends/:id/circles
 * Set circles for a friend (replaces all existing circle assignments)
 */
app.put('/:id/circles', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const validated = await parseBody(c, SetFriendCirclesSchema);

  const circlesService = new CirclesService({ db: db });
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
  const friendId = requireUuidParam(c, 'id');
  const circleId = requireUuidParam(c, 'circleId');

  const circlesService = new CirclesService({ db: db });
  const circle = await circlesService.addFriendToCircle(user.userId, friendId, circleId);

  if (!circle) {
    throw new ResourceNotFoundError('Friend or circle');
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
  const friendId = requireUuidParam(c, 'id');
  const circleId = requireUuidParam(c, 'circleId');

  const circlesService = new CirclesService({ db: db });
  const removed = await circlesService.removeFriendFromCircle(user.userId, friendId, circleId);

  if (!removed) {
    throw new ResourceNotFoundError('Friend-circle assignment');
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
  const friendId = requireUuidParam(c, 'id', 'friend ID');

  const friendsService = new FriendsService({ db: db, logger: logger });
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
app.post('/:id/archive', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');

  // The reason is optional, so an empty body is valid here — parseBody would
  // reject it as malformed JSON.
  let body: unknown = {};
  try {
    const text = await c.req.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = validate(ArchiveFriendSchema, body);

  const friendsService = new FriendsService({ db: db, logger: logger });
  const archived = await friendsService.archiveFriend(user.userId, friendId, validated.reason);

  if (!archived) {
    throw new FriendNotFoundError('Friend not found or already archived');
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
  const friendId = requireUuidParam(c, 'id', 'friend ID');

  const friendsService = new FriendsService({ db: db, logger: logger });
  const unarchived = await friendsService.unarchiveFriend(user.userId, friendId);

  if (!unarchived) {
    throw new FriendNotFoundError('Friend not found or not archived');
  }

  return c.json({ message: 'Friend unarchived successfully' });
});

export default app;
