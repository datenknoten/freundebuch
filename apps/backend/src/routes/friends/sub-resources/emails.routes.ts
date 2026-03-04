import { EmailInputSchema, type ErrorResponse } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { FriendNotFoundError, ValidationError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/emails
 * Add an email address to a friend
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

  const validated = EmailInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

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
  const friendId = c.req.param('id') ?? '';
  const emailId = c.req.param('emailId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(emailId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = EmailInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const email = await friendsService.updateEmail(user.userId, friendId, emailId, validated);

  if (!email) {
    return c.json<ErrorResponse>({ error: 'Email not found' }, 404);
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
  const friendId = c.req.param('id') ?? '';
  const emailId = c.req.param('emailId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(emailId)) {
    throw new ValidationError('Invalid ID');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteEmail(user.userId, friendId, emailId);

  if (!deleted) {
    return c.json<ErrorResponse>({ error: 'Email not found' }, 404);
  }

  return c.json({ message: 'Email deleted successfully' });
});

export default app;
