import type { Stats } from 'node:fs';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { ValidationError } from '@datenknoten/kit';
import { Hono, type MiddlewareHandler } from 'hono';
import { ResourceNotFoundError } from '../errors/resource-not-found.error.js';
import { getAuthUser } from '../middleware/auth.js';
import type { FriendsService } from '../services/friends/friends.service.js';
import type { PhotoService } from '../services/photo.service.js';
import type { AppContext } from '../types/context.js';
import { isNodeError } from '../utils/is-node-error.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

/**
 * RFC 9110 If-None-Match: a comma-separated list, `*`, or weak validators.
 * Comparing the raw header against the ETag missed every browser that sends
 * more than one candidate or the `W/` prefix, so those clients re-downloaded
 * an unchanged photo on each request.
 */
function etagMatches(header: string | undefined, etag: string) {
  if (header === undefined) {
    return false;
  }
  if (header.trim() === '*') {
    return true;
  }
  return header.split(',').some((candidate) => candidate.trim().replace(/^W\//, '') === etag);
}

export interface UploadsRoutesOptions {
  friendsService: FriendsService;
  photoService: PhotoService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
}

export function createUploadsRoutes(options: UploadsRoutesOptions) {
  const { friendsService, photoService, authMiddleware, onboardingMiddleware } = options;
  const app = new Hono<AppContext>();

  app.use('*', authMiddleware);
  app.use('*', onboardingMiddleware);

  // Serves uploaded friend photos, only to the owner
  app.get('/friends/:friendId/:filename', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'friendId', 'friend ID');
    const filename = c.req.param('filename');

    // Verifies the user owns this friend
    await friendsService.getFriend(user.userId, friendId);

    // Prevent directory traversal
    if (
      filename === '' ||
      filename.includes('..') === true ||
      filename.includes('/') === true ||
      filename.includes('\\') === true
    ) {
      throw new ValidationError('Invalid filename');
    }

    const allowedFilenames = [
      'photo.jpg',
      'photo.png',
      'photo.webp',
      'photo_thumb.jpg',
      'photo_thumb.png',
      'photo_thumb.webp',
    ];
    if (allowedFilenames.includes(filename) === false) {
      throw new ValidationError('Invalid filename');
    }

    const uploadDir = photoService.getUploadDir();
    const filePath = path.join(uploadDir, friendId, filename);

    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = contentTypes[ext] ?? 'application/octet-stream';

    let fileStat: Stats;
    try {
      fileStat = await stat(filePath);
    } catch (error) {
      if (isNodeError(error) === true && error.code === 'ENOENT') {
        throw new ResourceNotFoundError('Photo', `${friendId}/${filename}`);
      }
      throw error;
    }

    if (fileStat.isFile() === false) {
      throw new ResourceNotFoundError('Photo', `${friendId}/${filename}`);
    }

    // Photos are immutable per (friend, filename) until re-uploaded, and every
    // re-upload changes size or mtime — so size+mtime is a sound strong validator
    // and lets a friend-list render skip re-downloading every thumbnail.
    const etag = `"${fileStat.size.toString(16)}-${Math.floor(fileStat.mtimeMs).toString(16)}"`;

    c.header('ETag', etag);
    c.header('Cache-Control', 'private, max-age=86400'); // 1 day cache, browser only
    c.header('Last-Modified', fileStat.mtime.toUTCString());

    if (etagMatches(c.req.header('If-None-Match'), etag) === true) {
      return c.body(null, 304);
    }

    c.header('Content-Type', contentType);
    c.header('Content-Length', fileStat.size.toString());

    // Stream rather than buffer: a 5 MB original would otherwise sit in the heap
    // for the whole response.
    return c.body(Readable.toWeb(createReadStream(filePath)));
  });

  return app;
}
