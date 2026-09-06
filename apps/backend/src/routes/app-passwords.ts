import { AppPasswordCreateSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import {
  type AppPassword,
  AppPasswordsService,
  type AppPasswordWithSecret,
} from '../services/app-passwords.service.js';
import type { AppContext } from '../types/context.js';
import { AppPasswordNotFoundError } from '../utils/errors.js';
import { parseBody, requireUuidParam } from '../utils/http.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require profile
app.use('*', onboardingMiddleware);

/**
 * GET /api/app-passwords
 * List all active app passwords for the current user
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const authUser = getAuthUser(c);
  const service = new AppPasswordsService({ db: db, logger: logger });
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
  const validated = await parseBody(c, AppPasswordCreateSchema);

  const service = new AppPasswordsService({ db: db, logger: logger });
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
  const appPasswordId = requireUuidParam(c, 'id', 'app password ID format');

  const service = new AppPasswordsService({ db: db, logger: logger });
  const success = await service.revokeAppPassword(authUser.userId, appPasswordId);

  if (!success) {
    throw new AppPasswordNotFoundError();
  }

  return c.json({ success: true });
});

export default app;
