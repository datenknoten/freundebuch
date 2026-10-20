import {
  AppPasswordCreateInputSchema,
  type AppPasswordCreateResponse,
  type AppPasswordResponse,
} from '@freundebuch/shared/index.js';
import { Hono, type MiddlewareHandler } from 'hono';
import { getAuthUser } from '../middleware/auth.js';
import type { AppPasswordsService } from '../services/app-passwords.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

export interface AppPasswordsRoutesOptions {
  appPasswordsService: AppPasswordsService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
}

export function createAppPasswordsRoutes(options: AppPasswordsRoutesOptions) {
  const { appPasswordsService, authMiddleware, onboardingMiddleware } = options;
  const app = new Hono<AppContext>();

  app.use('*', authMiddleware);
  app.use('*', onboardingMiddleware);

  // Active app passwords only
  app.get('/', async (c) => {
    const authUser = getAuthUser(c);
    const passwords = await appPasswordsService.listAppPasswords(authUser.userId);

    return c.json<AppPasswordResponse[]>(passwords);
  });

  // The response is the only time the password is returned
  app.post('/', async (c) => {
    const authUser = getAuthUser(c);
    const validated = await parseBody(c, AppPasswordCreateInputSchema);

    const result = await appPasswordsService.createAppPassword(authUser.userId, validated.name);

    return c.json<AppPasswordCreateResponse>(result, 201);
  });

  app.delete('/:id', async (c) => {
    const authUser = getAuthUser(c);
    const appPasswordId = requireUuidParam(c, 'id', 'app password ID format');

    await appPasswordsService.revokeAppPassword(authUser.userId, appPasswordId);

    return c.json({ success: true });
  });

  return app;
}
