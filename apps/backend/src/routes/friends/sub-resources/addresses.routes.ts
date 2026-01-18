import { AddressInputSchema, type ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { toError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/addresses
 * Add an address to a friend
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = AddressInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const address = await friendsService.addAddress(user.userId, friendId, validated);

    if (!address) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(address, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add address');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add address' }, 500);
  }
});

/**
 * PUT /api/friends/:id/addresses/:addressId
 * Update an address
 */
app.put('/:addressId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const addressId = c.req.param('addressId')!;

  if (!isValidUuid(friendId) || !isValidUuid(addressId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = AddressInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const address = await friendsService.updateAddress(user.userId, friendId, addressId, validated);

    if (!address) {
      return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
    }

    return c.json(address);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, addressId }, 'Failed to update address');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update address' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/addresses/:addressId
 * Delete an address
 */
app.delete('/:addressId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const addressId = c.req.param('addressId')!;

  if (!isValidUuid(friendId) || !isValidUuid(addressId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteAddress(user.userId, friendId, addressId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
    }

    return c.json({ message: 'Address deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, addressId }, 'Failed to delete address');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete address' }, 500);
  }
});

export default app;
