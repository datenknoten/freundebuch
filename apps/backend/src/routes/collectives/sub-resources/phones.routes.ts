import { type ErrorResponse, PhoneInputSchema } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectivePhoneService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { isAppError, toError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

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
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const phoneService = new CollectivePhoneService({ db, logger });
    const phones = await phoneService.list(user.userId, collectiveId);
    return c.json(phones);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list phones for collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to list phones for collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list phones' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = PhoneInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const phoneService = new CollectivePhoneService({ db, logger });
    const phone = await phoneService.add(user.userId, collectiveId, validated);

    if (!phone) {
      return c.json<ErrorResponse>({ error: 'Collective not found' }, 404);
    }

    return c.json(phone, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to add phone to collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to add phone to collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add phone' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = PhoneInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const phoneService = new CollectivePhoneService({ db, logger });
    const phone = await phoneService.update(user.userId, collectiveId, phoneId, validated);

    if (!phone) {
      return c.json<ErrorResponse>({ error: 'Phone not found' }, 404);
    }

    return c.json(phone);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update phone');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, phoneId }, 'Failed to update phone');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update phone' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const phoneService = new CollectivePhoneService({ db, logger });
    const deleted = await phoneService.delete(user.userId, collectiveId, phoneId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Phone not found' }, 404);
    }

    return c.json({ message: 'Phone deleted successfully' });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to delete phone');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, phoneId }, 'Failed to delete phone');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete phone' }, 500);
  }
});

export default app;
