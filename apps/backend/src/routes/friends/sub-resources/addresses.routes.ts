import { AddressInputSchema } from '@freundebuch/shared/index.js';
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
 * POST /api/friends/:id/addresses
 * Add an address to a friend
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

  const validated = AddressInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const address = await friendsService.addAddress(user.userId, friendId, validated);

  if (!address) {
    throw new FriendNotFoundError();
  }

  return c.json(address, 201);
});

/**
 * PUT /api/friends/:id/addresses/:addressId
 * Update an address
 */
app.put('/:addressId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const addressId = c.req.param('addressId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(addressId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = AddressInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const address = await friendsService.updateAddress(user.userId, friendId, addressId, validated);

  if (!address) {
    throw new ResourceNotFoundError('Address');
  }

  return c.json(address);
});

/**
 * DELETE /api/friends/:id/addresses/:addressId
 * Delete an address
 */
app.delete('/:addressId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const addressId = c.req.param('addressId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(addressId)) {
    throw new ValidationError('Invalid ID');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteAddress(user.userId, friendId, addressId);

  if (!deleted) {
    throw new ResourceNotFoundError('Address');
  }

  return c.json({ message: 'Address deleted successfully' });
});

export default app;
