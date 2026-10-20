import { ValidationError } from '@datenknoten/kit';
import { parseJson } from '@datenknoten/kit/schema';
import {
  ArchiveFriendInputSchema,
  MAX_FILE_SIZE,
  PHOTO_VALIDATION_ERRORS,
  SetFriendCirclesInputSchema,
} from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getAuthUser } from '../../middleware/auth.js';
import type { CirclesService } from '../../services/circles.service.js';
import type { FriendsService } from '../../services/friends/friends.service.js';
import type { PhotoService } from '../../services/photo.service.js';
import type { AppContext } from '../../types/context.js';
import { parseBody } from '../../utils/parse-body.js';
import { requireUuidParam } from '../../utils/require-uuid-param.js';

export interface OrganizationRoutesOptions {
  friendsService: FriendsService;
  photoService: PhotoService;
  circlesService: CirclesService;
}

export function createOrganizationRoutes(options: OrganizationRoutesOptions) {
  const app = new Hono<AppContext>();

  //#region Photo

  app.post(
    '/:id/photo',
    // Reject oversized bodies before buffering them; the service-level size check
    // only fires after the whole file is already in memory. The slack covers the
    // multipart envelope around a MAX_FILE_SIZE payload.
    bodyLimit({
      maxSize: MAX_FILE_SIZE + 64 * 1024,
      onError(c) {
        return c.json({ error: PHOTO_VALIDATION_ERRORS.FILE_TOO_LARGE }, 413);
      },
    }),
    async (c) => {
      const logger = c.get('logger');
      const user = getAuthUser(c);
      // UUID-validated to prevent path traversal
      const friendId = requireUuidParam(c, 'id', 'friend ID');

      const formData = await c.req.formData();
      const file = formData.get('photo');

      if (file instanceof File === false) {
        throw new ValidationError(PHOTO_VALIDATION_ERRORS.NO_FILE_PROVIDED);
      }

      // Verifies the friend exists and belongs to the user
      await options.friendsService.getFriend(user.userId, friendId);

      const result = await options.photoService.uploadPhoto(friendId, file);

      // If the DB update fails, clean up the uploaded files to prevent orphaned files
      try {
        await options.friendsService.updatePhoto(
          user.userId,
          friendId,
          result.photoUrl,
          result.photoThumbnailUrl,
        );
      } catch (dbError) {
        logger.warn({ friendId }, 'DB update failed, cleaning up uploaded photo');
        try {
          await options.photoService.deletePhoto(friendId);
        } catch (cleanupError) {
          logger.error({ cleanupError, friendId }, 'Failed to clean up photo after DB error');
        }
        throw dbError;
      }

      return c.json(result, 201);
    },
  );

  app.delete('/:id/photo', async (c) => {
    const user = getAuthUser(c);
    // UUID-validated to prevent path traversal
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    await options.friendsService.getFriend(user.userId, friendId);

    await options.photoService.deletePhoto(friendId);

    await options.friendsService.updatePhoto(user.userId, friendId, null, null);

    return c.json({ message: 'Photo deleted successfully' });
  });

  //#endregion

  //#region Circle assignment

  app.get('/:id/circles', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const circles = await options.circlesService.getCirclesForFriend(user.userId, friendId);

    return c.json(circles);
  });

  // Replaces all existing circle assignments
  app.put('/:id/circles', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');
    const validated = await parseBody(c, SetFriendCirclesInputSchema);

    const circles = await options.circlesService.setFriendCircles(
      user.userId,
      friendId,
      validated.circle_ids,
    );

    return c.json(circles);
  });

  app.post('/:id/circles/:circleId', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id');
    const circleId = requireUuidParam(c, 'circleId');

    const circle = await options.circlesService.addFriendToCircle(user.userId, friendId, circleId);

    return c.json(circle, 201);
  });

  app.delete('/:id/circles/:circleId', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id');
    const circleId = requireUuidParam(c, 'circleId');

    await options.circlesService.removeFriendFromCircle(user.userId, friendId, circleId);

    return c.json({ message: 'Friend removed from circle successfully' });
  });

  //#endregion

  //#region Favorites and archive

  app.post('/:id/favorite', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const isFavorite = await options.friendsService.toggleFavorite(user.userId, friendId);

    return c.json({ is_favorite: isFavorite });
  });

  app.post('/:id/archive', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    // The reason is optional, so an empty body is valid here — parseBody would
    // reject it as malformed JSON.
    const text = await c.req.text();
    const validated = parseJson(ArchiveFriendInputSchema, text === '' ? '{}' : text);

    await options.friendsService.archiveFriend(user.userId, friendId, validated.reason);

    return c.json({ message: 'Friend archived successfully' });
  });

  app.post('/:id/unarchive', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    await options.friendsService.unarchiveFriend(user.userId, friendId);

    return c.json({ message: 'Friend unarchived successfully' });
  });

  //#endregion

  return app;
}
