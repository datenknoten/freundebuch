import { AddressInputSchema, type ErrorResponse } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveAddressService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { CollectiveNotFoundError, ValidationError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * GET /api/collectives/:id/addresses
 * List all addresses for a collective
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const addressService = new CollectiveAddressService({ db, logger });
  const addresses = await addressService.list(user.userId, collectiveId);
  return c.json(addresses);
});

/**
 * POST /api/collectives/:id/addresses
 * Add an address to a collective
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

  const validated = AddressInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const addressService = new CollectiveAddressService({ db, logger });
  const address = await addressService.add(user.userId, collectiveId, validated);

  if (!address) {
    throw new CollectiveNotFoundError();
  }

  return c.json(address, 201);
});

/**
 * PUT /api/collectives/:id/addresses/:addressId
 * Update an address
 */
app.put('/:addressId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';
  const addressId = c.req.param('addressId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(addressId)) {
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

  const addressService = new CollectiveAddressService({ db, logger });
  const address = await addressService.update(user.userId, collectiveId, addressId, validated);

  if (!address) {
    return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
  }

  return c.json(address);
});

/**
 * DELETE /api/collectives/:id/addresses/:addressId
 * Delete an address
 */
app.delete('/:addressId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';
  const addressId = c.req.param('addressId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(addressId)) {
    throw new ValidationError('Invalid ID');
  }

  const addressService = new CollectiveAddressService({ db, logger });
  const deleted = await addressService.delete(user.userId, collectiveId, addressId);

  if (!deleted) {
    return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
  }

  return c.json({ message: 'Address deleted successfully' });
});

export default app;
