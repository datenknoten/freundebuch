import { MetInfoInputSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { FriendNotFoundError, ResourceNotFoundError } from '../../../utils/errors.js';
import { parseBody, requireUuidParam } from '../../../utils/http.js';

const app = new Hono<AppContext>();

/**
 * PUT /api/friends/:id/met-info
 * Set or update how/where met information (upsert)
 */
app.put('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const validated = await parseBody(c, MetInfoInputSchema);

  const friendsService = new FriendsService(db, c.get('logger'));
  const metInfo = await friendsService.setMetInfo(user.userId, friendId, validated);

  if (!metInfo) {
    throw new FriendNotFoundError();
  }

  return c.json(metInfo);
});

/**
 * DELETE /api/friends/:id/met-info
 * Delete how/where met information
 */
app.delete('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteMetInfo(user.userId, friendId);

  if (!deleted) {
    throw new ResourceNotFoundError('Met info');
  }

  return c.json({ message: 'Met info deleted successfully' });
});

export default app;
