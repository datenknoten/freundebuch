import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import {
  type AppPassword,
  AppPasswordsService,
  type AppPasswordWithSecret,
} from '../services/app-passwords.service.js';
import type { AppContext } from '../types/context.js';
import { AppPasswordNotFoundError, ValidationError } from '../utils/errors.js';
import { isValidUuid } from '../utils/security.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require profile
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

  const authUser = getAuthUser(c);
  const service = new AppPasswordsService(db, logger);
  const passwords = await service.listAppPasswords(authUser.userId);

  return c.json<AppPassword[]>(passwords);
});

/**
 * POST /api/app-passwords
 * Create a new app password
 * Returns the password only once
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const authUser = getAuthUser(c);
  const body = await c.req.json();
  const validated = CreateAppPasswordSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request: name is required and must be 1-100 characters');
  }

  const service = new AppPasswordsService(db, logger);
  const result = await service.createAppPassword(authUser.userId, validated.name);

  return c.json<AppPasswordWithSecret>(result, 201);
});

/**
 * DELETE /api/app-passwords/:id
 * Revoke an app password
 */
app.delete('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const authUser = getAuthUser(c);
  const appPasswordId = c.req.param('id');

  // Validate UUID format
  if (!isValidUuid(appPasswordId)) {
    throw new ValidationError('Invalid app password ID format');
  }

  const service = new AppPasswordsService(db, logger);
  const success = await service.revokeAppPassword(authUser.userId, appPasswordId);

  if (!success) {
    throw new AppPasswordNotFoundError();
  }

  return c.json({ success: true });
});

export default app;
