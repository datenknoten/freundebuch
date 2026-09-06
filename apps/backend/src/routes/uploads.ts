import { createReadStream } from 'node:fs';
import type { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { FriendsService } from '../services/friends/index.js';
import { PhotoService } from '../services/photo.service.js';
import type { AppContext } from '../types/context.js';
import { FriendNotFoundError, ResourceNotFoundError, ValidationError } from '../utils/errors.js';
import { requireUuidParam } from '../utils/http.js';
import { isNodeError } from '../utils/type-guards.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all upload routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require profile
app.use('*', onboardingMiddleware);

/**
 * GET /api/uploads/friends/:friendId/:filename
 * Serve uploaded friend photos (only to the owner)
 */
app.get('/friends/:friendId/:filename', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'friendId', 'friend ID');
  const filename = c.req.param('filename');

  // Verify the user owns this friend
  const friendsService = new FriendsService(db, logger);
  const friend = await friendsService.getFriendById(user.userId, friendId);

  if (!friend) {
    throw new FriendNotFoundError();
  }

  // Validate filename to prevent directory traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new ValidationError('Invalid filename');
  }

  // Only allow specific filenames
  const allowedFilenames = [
    'photo.jpg',
    'photo.png',
    'photo.webp',
    'photo_thumb.jpg',
    'photo_thumb.png',
    'photo_thumb.webp',
  ];
  if (!allowedFilenames.includes(filename)) {
    throw new ValidationError('Invalid filename');
  }

  const photoService = new PhotoService(logger);
  const uploadDir = photoService.getUploadDir();
  const filePath = path.join(uploadDir, friendId, filename);

  // Determine content type
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
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new ResourceNotFoundError('Photo');
    }
    logger.error({ error, friendId, filename }, 'Failed to serve photo');
    throw error;
  }

  if (!fileStat.isFile()) {
    throw new ResourceNotFoundError('Photo');
  }

  // Photos are immutable per (friend, filename) until re-uploaded, and every
  // re-upload changes size or mtime — so size+mtime is a sound strong validator
  // and lets a friend-list render skip re-downloading every thumbnail.
  const etag = `"${fileStat.size.toString(16)}-${Math.floor(fileStat.mtimeMs).toString(16)}"`;

  c.header('ETag', etag);
  c.header('Cache-Control', 'private, max-age=86400'); // 1 day cache, browser only
  c.header('Last-Modified', fileStat.mtime.toUTCString());

  if (c.req.header('If-None-Match') === etag) {
    return c.body(null, 304);
  }

  c.header('Content-Type', contentType);
  c.header('Content-Length', fileStat.size.toString());

  // Stream rather than buffer: a 5 MB original would otherwise sit in the heap
  // for the whole response.
  return c.body(Readable.toWeb(createReadStream(filePath)));
});

export default app;
