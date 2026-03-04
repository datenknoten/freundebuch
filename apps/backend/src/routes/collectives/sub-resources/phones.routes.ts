import { normalizePhoneNumber, PhoneInputSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import {
  CollectiveAddressService,
  CollectivePhoneService,
} from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { countryNameToCode, localeToCountry } from '../../../utils/country.js';
import {
  CollectiveNotFoundError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';
import { isRecord } from '../../../utils/type-guards.js';

const app = new Hono<AppContext>();

/**
 * GET /api/collectives/:id/phones
 * List all phone numbers for a collective
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const phoneService = new CollectivePhoneService({ db, logger });
  const phones = await phoneService.list(user.userId, collectiveId);
  return c.json(phones);
});

/**
 * POST /api/collectives/:id/phones
 * Add a phone number to a collective
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }
  if (!isRecord(body)) throw new ValidationError('Invalid JSON');
  const rawBody = { ...body };

  // Normalize national-format phone numbers to E.164 before validation
  if (typeof rawBody.phone_number === 'string' && !rawBody.phone_number.startsWith('+')) {
    const addressService = new CollectiveAddressService({ db, logger });
    const addresses = await addressService.list(user.userId, collectiveId);
    const primaryAddress = addresses.find((a) => a.isPrimary) ?? addresses[0];
    const countryCode =
      (primaryAddress?.country && countryNameToCode(primaryAddress.country)) ??
      localeToCountry(c.req.header('Accept-Language'));
    rawBody.phone_number = normalizePhoneNumber(rawBody.phone_number, countryCode);
  }

  const validated = PhoneInputSchema(rawBody);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const phoneService = new CollectivePhoneService({ db, logger });
  const phone = await phoneService.add(user.userId, collectiveId, validated);

  if (!phone) {
    throw new CollectiveNotFoundError();
  }

  return c.json(phone, 201);
});

/**
 * PUT /api/collectives/:id/phones/:phoneId
 * Update a phone number
 */
app.put('/:phoneId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';
  const phoneId = c.req.param('phoneId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(phoneId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }
  if (!isRecord(body)) throw new ValidationError('Invalid JSON');
  const rawBody = { ...body };

  // Normalize national-format phone numbers to E.164 before validation
  if (typeof rawBody.phone_number === 'string' && !rawBody.phone_number.startsWith('+')) {
    const addressService = new CollectiveAddressService({ db, logger });
    const addresses = await addressService.list(user.userId, collectiveId);
    const primaryAddress = addresses.find((a) => a.isPrimary) ?? addresses[0];
    const countryCode =
      (primaryAddress?.country && countryNameToCode(primaryAddress.country)) ??
      localeToCountry(c.req.header('Accept-Language'));
    rawBody.phone_number = normalizePhoneNumber(rawBody.phone_number, countryCode);
  }

  const validated = PhoneInputSchema(rawBody);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const phoneService = new CollectivePhoneService({ db, logger });
  const phone = await phoneService.update(user.userId, collectiveId, phoneId, validated);

  if (!phone) {
    throw new ResourceNotFoundError('Phone');
  }

  return c.json(phone);
});

/**
 * DELETE /api/collectives/:id/phones/:phoneId
 * Delete a phone number
 */
app.delete('/:phoneId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';
  const phoneId = c.req.param('phoneId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(phoneId)) {
    throw new ValidationError('Invalid ID');
  }

  const phoneService = new CollectivePhoneService({ db, logger });
  const deleted = await phoneService.delete(user.userId, collectiveId, phoneId);

  if (!deleted) {
    throw new ResourceNotFoundError('Phone');
  }

  return c.json({ message: 'Phone deleted successfully' });
});

export default app;
