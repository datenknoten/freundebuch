import { normalizePhoneNumber, PhoneInputSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { countryNameToCode, localeToCountry } from '../../../utils/country.js';
import {
  FriendNotFoundError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';
import { isRecord } from '../../../utils/type-guards.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/phones
 * Add a phone number to a friend
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }
  if (!isRecord(rawBody)) {
    throw new ValidationError('Invalid JSON');
  }
  const body = { ...rawBody };

  // Normalize national-format phone numbers to E.164 before validation
  if (typeof body.phone_number === 'string' && !body.phone_number.startsWith('+')) {
    const friendsService = new FriendsService(db, c.get('logger'));
    const friend = await friendsService.getFriendById(user.userId, friendId);
    const primaryAddress = friend?.addresses.find((a) => a.isPrimary) ?? friend?.addresses[0];
    const countryCode =
      (primaryAddress?.country && countryNameToCode(primaryAddress.country)) ??
      localeToCountry(c.req.header('Accept-Language'));
    body.phone_number = normalizePhoneNumber(body.phone_number, countryCode);
  }

  const validated = PhoneInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const phone = await friendsService.addPhone(user.userId, friendId, validated);

  if (!phone) {
    throw new FriendNotFoundError();
  }

  return c.json(phone, 201);
});

/**
 * PUT /api/friends/:id/phones/:phoneId
 * Update a phone number
 */
app.put('/:phoneId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const phoneId = c.req.param('phoneId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(phoneId)) {
    throw new ValidationError('Invalid ID');
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }
  if (!isRecord(rawBody)) {
    throw new ValidationError('Invalid JSON');
  }
  const body = { ...rawBody };

  // Normalize national-format phone numbers to E.164 before validation
  if (typeof body.phone_number === 'string' && !body.phone_number.startsWith('+')) {
    const friendsService = new FriendsService(db, c.get('logger'));
    const friend = await friendsService.getFriendById(user.userId, friendId);
    const primaryAddress = friend?.addresses.find((a) => a.isPrimary) ?? friend?.addresses[0];
    const countryCode =
      (primaryAddress?.country && countryNameToCode(primaryAddress.country)) ??
      localeToCountry(c.req.header('Accept-Language'));
    body.phone_number = normalizePhoneNumber(body.phone_number, countryCode);
  }

  const validated = PhoneInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const phone = await friendsService.updatePhone(user.userId, friendId, phoneId, validated);

  if (!phone) {
    throw new ResourceNotFoundError('Phone');
  }

  return c.json(phone);
});

/**
 * DELETE /api/friends/:id/phones/:phoneId
 * Delete a phone number
 */
app.delete('/:phoneId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const phoneId = c.req.param('phoneId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(phoneId)) {
    throw new ValidationError('Invalid ID');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deletePhone(user.userId, friendId, phoneId);

  if (!deleted) {
    throw new ResourceNotFoundError('Phone');
  }

  return c.json({ message: 'Phone deleted successfully' });
});

export default app;
