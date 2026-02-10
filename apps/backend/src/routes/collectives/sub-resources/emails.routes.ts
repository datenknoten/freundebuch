import { EmailInputSchema, type ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveEmailService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { isAppError, toError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * GET /api/collectives/:id/emails
 * List all emails for a collective
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
    const emailService = new CollectiveEmailService({ db, logger });
    const emails = await emailService.list(user.userId, collectiveId);
    return c.json(emails);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list emails for collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to list emails for collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list emails' }, 500);
  }
});

/**
 * POST /api/collectives/:id/emails
 * Add an email to a collective
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

    const validated = EmailInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const emailService = new CollectiveEmailService({ db, logger });
    const email = await emailService.add(user.userId, collectiveId, validated);

    if (!email) {
      return c.json<ErrorResponse>({ error: 'Collective not found' }, 404);
    }

    return c.json(email, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to add email to collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to add email to collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add email' }, 500);
  }
});

/**
 * PUT /api/collectives/:id/emails/:emailId
 * Update an email
 */
app.put('/:emailId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';
  const emailId = c.req.param('emailId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(emailId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = EmailInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const emailService = new CollectiveEmailService({ db, logger });
    const email = await emailService.update(user.userId, collectiveId, emailId, validated);

    if (!email) {
      return c.json<ErrorResponse>({ error: 'Email not found' }, 404);
    }

    return c.json(email);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update email');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, emailId }, 'Failed to update email');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update email' }, 500);
  }
});

/**
 * DELETE /api/collectives/:id/emails/:emailId
 * Delete an email
 */
app.delete('/:emailId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';
  const emailId = c.req.param('emailId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(emailId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const emailService = new CollectiveEmailService({ db, logger });
    const deleted = await emailService.delete(user.userId, collectiveId, emailId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Email not found' }, 404);
    }

    return c.json({ message: 'Email deleted successfully' });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to delete email');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, emailId }, 'Failed to delete email');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete email' }, 500);
  }
});

export default app;
