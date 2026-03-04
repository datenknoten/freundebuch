import { DateInputSchema, type ErrorResponse } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { FriendNotFoundError, ValidationError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/dates
 * Add an important date to a friend
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

  const validated = DateInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const date = await friendsService.addDate(user.userId, friendId, validated);

  if (!date) {
    throw new FriendNotFoundError();
  }

  return c.json(date, 201);
});

/**
 * PUT /api/friends/:id/dates/:dateId
 * Update an important date
 */
app.put('/:dateId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const dateId = c.req.param('dateId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(dateId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = DateInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const date = await friendsService.updateDate(user.userId, friendId, dateId, validated);

  if (!date) {
    return c.json<ErrorResponse>({ error: 'Date not found' }, 404);
  }

  return c.json(date);
});

/**
 * DELETE /api/friends/:id/dates/:dateId
 * Delete an important date
 */
app.delete('/:dateId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const dateId = c.req.param('dateId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(dateId)) {
    throw new ValidationError('Invalid ID');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteDate(user.userId, friendId, dateId);

  if (!deleted) {
    return c.json<ErrorResponse>({ error: 'Date not found' }, 404);
  }

  return c.json({ message: 'Date deleted successfully' });
});

export default app;
