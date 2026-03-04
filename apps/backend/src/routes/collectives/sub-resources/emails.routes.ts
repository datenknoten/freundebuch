import { EmailInputSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveEmailService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import {
  CollectiveNotFoundError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../utils/errors.js';
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
    throw new ValidationError('Invalid collective ID');
  }

  const emailService = new CollectiveEmailService({ db, logger });
  const emails = await emailService.list(user.userId, collectiveId);
  return c.json(emails);
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
    throw new ValidationError('Invalid collective ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = EmailInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const emailService = new CollectiveEmailService({ db, logger });
  const email = await emailService.add(user.userId, collectiveId, validated);

  if (!email) {
    throw new CollectiveNotFoundError();
  }

  return c.json(email, 201);
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
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = EmailInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const emailService = new CollectiveEmailService({ db, logger });
  const email = await emailService.update(user.userId, collectiveId, emailId, validated);

  if (!email) {
    throw new ResourceNotFoundError('Email');
  }

  return c.json(email);
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
    throw new ValidationError('Invalid ID');
  }

  const emailService = new CollectiveEmailService({ db, logger });
  const deleted = await emailService.delete(user.userId, collectiveId, emailId);

  if (!deleted) {
    throw new ResourceNotFoundError('Email');
  }

  return c.json({ message: 'Email deleted successfully' });
});

export default app;
