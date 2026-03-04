import { UrlInputSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import {
  FriendNotFoundError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/urls
 * Add a URL to a friend
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = UrlInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const url = await friendsService.addUrl(user.userId, friendId, validated);

  if (!url) {
    throw new FriendNotFoundError();
  }

  return c.json(url, 201);
});

/**
 * PUT /api/friends/:id/urls/:urlId
 * Update a URL
 */
app.put('/:urlId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const urlId = c.req.param('urlId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(urlId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = UrlInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const url = await friendsService.updateUrl(user.userId, friendId, urlId, validated);

  if (!url) {
    throw new ResourceNotFoundError('URL');
  }

  return c.json(url);
});

/**
 * DELETE /api/friends/:id/urls/:urlId
 * Delete a URL
 */
app.delete('/:urlId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const urlId = c.req.param('urlId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(urlId)) {
    throw new ValidationError('Invalid ID');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteUrl(user.userId, friendId, urlId);

  if (!deleted) {
    throw new ResourceNotFoundError('URL');
  }

  return c.json({ message: 'URL deleted successfully' });
});

export default app;
