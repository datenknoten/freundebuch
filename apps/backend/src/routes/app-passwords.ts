import type { ErrorResponse } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import {
  type AppPassword,
  AppPasswordsService,
  type AppPasswordWithSecret,
} from '../services/app-passwords.service.js';
import type { AppContext } from '../types/context.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// Validation schema for creating an app password
const CreateAppPasswordSchema = type({
  name: 'string >= 1 & string <= 100',
});

/**
 * GET /api/app-passwords
 * List all active app passwords for the current user
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const service = new AppPasswordsService(db, logger);
    const passwords = await service.listAppPasswords(authUser.userId);

    return c.json<AppPassword[]>(passwords);
  } catch (error) {
    logger.error({ error }, 'Failed to list app passwords');
    return c.json<ErrorResponse>({ error: 'Failed to list app passwords' }, 500);
  }
});

/**
 * POST /api/app-passwords
 * Create a new app password
 * Returns the password only once
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const body = await c.req.json();
    const validated = CreateAppPasswordSchema(body);

    if (validated instanceof type.errors) {
      logger.warn({ body, errors: validated }, 'Invalid create app password request');
      return c.json<ErrorResponse>(
        {
          error: 'Invalid request: name is required and must be 1-100 characters',
        },
        400,
      );
    }

    const service = new AppPasswordsService(db, logger);
    const result = await service.createAppPassword(authUser.userId, validated.name);

    return c.json<AppPasswordWithSecret>(result, 201);
  } catch (error) {
    logger.error({ error }, 'Failed to create app password');
    return c.json<ErrorResponse>({ error: 'Failed to create app password' }, 500);
  }
});

/**
 * DELETE /api/app-passwords/:id
 * Revoke an app password
 */
app.delete('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const appPasswordId = c.req.param('id');

    const service = new AppPasswordsService(db, logger);
    const success = await service.revokeAppPassword(authUser.userId, appPasswordId);

    if (!success) {
      return c.json<ErrorResponse>({ error: 'App password not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to revoke app password');
    return c.json<ErrorResponse>({ error: 'Failed to revoke app password' }, 500);
  }
});

export default app;
