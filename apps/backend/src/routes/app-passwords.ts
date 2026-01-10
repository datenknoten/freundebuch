import type { ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import {
  type AppPassword,
  AppPasswordsService,
  type AppPasswordWithSecret,
  MaxAppPasswordsExceededError,
} from '../services/app-passwords.service.js';
import type { AppContext } from '../types/context.js';
import { isAppError } from '../utils/errors.js';

// UUID v4 format regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const app = new Hono<AppContext>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require self-contact
app.use('*', onboardingMiddleware);

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
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list app passwords');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to list app passwords');
    Sentry.captureException(err);
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
    if (error instanceof MaxAppPasswordsExceededError) {
      return c.json<ErrorResponse>(
        { error: 'Maximum number of app passwords (20) reached. Please revoke unused ones.' },
        429,
      );
    }

    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to create app password');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to create app password');
    Sentry.captureException(err);
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

    // Validate UUID format
    if (!UUID_REGEX.test(appPasswordId)) {
      return c.json<ErrorResponse>({ error: 'Invalid app password ID format' }, 400);
    }

    const service = new AppPasswordsService(db, logger);
    const success = await service.revokeAppPassword(authUser.userId, appPasswordId);

    if (!success) {
      return c.json<ErrorResponse>({ error: 'App password not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    // Handle AppErrors with their status codes
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to revoke app password');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err }, 'Failed to revoke app password');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to revoke app password' }, 500);
  }
});

export default app;
