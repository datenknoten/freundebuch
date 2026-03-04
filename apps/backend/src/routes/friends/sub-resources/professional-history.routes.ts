import { ProfessionalHistoryInputSchema } from '@freundebuch/shared/index.js';
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
 * POST /api/friends/:id/professional-history
 * Add a professional history entry to a friend
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

  const validated = ProfessionalHistoryInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const history = await friendsService.addProfessionalHistory(user.userId, friendId, validated);

  if (!history) {
    throw new FriendNotFoundError();
  }

  return c.json(history, 201);
});

/**
 * PUT /api/friends/:id/professional-history/:historyId
 * Update a professional history entry
 */
app.put('/:historyId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const historyId = c.req.param('historyId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(historyId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = ProfessionalHistoryInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const history = await friendsService.updateProfessionalHistory(
    user.userId,
    friendId,
    historyId,
    validated,
  );

  if (!history) {
    throw new ResourceNotFoundError('Professional history entry');
  }

  return c.json(history);
});

/**
 * DELETE /api/friends/:id/professional-history/:historyId
 * Delete a professional history entry
 */
app.delete('/:historyId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const historyId = c.req.param('historyId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(historyId)) {
    throw new ValidationError('Invalid ID');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteProfessionalHistory(user.userId, friendId, historyId);

  if (!deleted) {
    throw new ResourceNotFoundError('Professional history entry');
  }

  return c.json({ message: 'Professional history entry deleted' });
});

export default app;
