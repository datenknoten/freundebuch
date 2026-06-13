import { UrlInputSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { FriendNotFoundError, ResourceNotFoundError } from '../../../utils/errors.js';
import { parseBody, requireUuidParam } from '../../../utils/http.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/urls
 * Add a URL to a friend
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const validated = await parseBody(c, UrlInputSchema);

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
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const urlId = requireUuidParam(c, 'urlId', 'URL ID');
  const validated = await parseBody(c, UrlInputSchema);

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
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const urlId = requireUuidParam(c, 'urlId', 'URL ID');

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteUrl(user.userId, friendId, urlId);

  if (!deleted) {
    throw new ResourceNotFoundError('URL');
  }

  return c.json({ message: 'URL deleted successfully' });
});

export default app;
