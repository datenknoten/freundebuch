import { AddressInputSchema, type ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveAddressService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { isAppError, toError } from '../../../utils/errors.js';
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
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const addressService = new CollectiveAddressService({ db, logger });
    const addresses = await addressService.list(user.userId, collectiveId);
    return c.json(addresses);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list addresses for collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to list addresses for collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list addresses' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
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

    const addressService = new CollectiveAddressService({ db, logger });
    const address = await addressService.add(user.userId, collectiveId, validated);

    if (!address) {
      return c.json<ErrorResponse>({ error: 'Collective not found' }, 404);
    }

    return c.json(address, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to add address to collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to add address to collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add address' }, 500);
  }
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

    const addressService = new CollectiveAddressService({ db, logger });
    const address = await addressService.update(user.userId, collectiveId, addressId, validated);

    if (!address) {
      return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
    }

    return c.json(address);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update address');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, addressId }, 'Failed to update address');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update address' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const addressService = new CollectiveAddressService({ db, logger });
    const deleted = await addressService.delete(user.userId, collectiveId, addressId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Address not found' }, 404);
    }

    return c.json({ message: 'Address deleted successfully' });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to delete address');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, addressId }, 'Failed to delete address');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete address' }, 500);
  }
});

export default app;
