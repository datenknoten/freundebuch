import { EmailInputSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { FriendNotFoundError, ResourceNotFoundError } from '../../../utils/errors.js';
import { parseBody, requireUuidParam } from '../../../utils/http.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/emails
 * Add an email address to a friend
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const validated = await parseBody(c, EmailInputSchema);

  const friendsService = new FriendsService(db, c.get('logger'));
  const email = await friendsService.addEmail(user.userId, friendId, validated);

  if (!email) {
    throw new FriendNotFoundError();
  }

  return c.json(email, 201);
});

/**
 * PUT /api/friends/:id/emails/:emailId
 * Update an email address
 */
app.put('/:emailId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const emailId = requireUuidParam(c, 'emailId', 'email ID');
  const validated = await parseBody(c, EmailInputSchema);

  const friendsService = new FriendsService(db, c.get('logger'));
  const email = await friendsService.updateEmail(user.userId, friendId, emailId, validated);

  if (!email) {
    throw new ResourceNotFoundError('Email');
  }

  return c.json(email);
});

/**
 * DELETE /api/friends/:id/emails/:emailId
 * Delete an email address
 */
app.delete('/:emailId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const emailId = requireUuidParam(c, 'emailId', 'email ID');

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteEmail(user.userId, friendId, emailId);

  if (!deleted) {
    throw new ResourceNotFoundError('Email');
  }

  return c.json({ message: 'Email deleted successfully' });
});

export default app;
