import { FriendCreateInputSchema, SelfProfileSetInputSchema } from '@freundebuch/shared/index.js';
import { Hono, type MiddlewareHandler } from 'hono';
import { getAuthUser } from '../middleware/auth.js';
import type { UsersService } from '../services/users.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';

export interface UsersRoutesOptions {
  usersService: UsersService;
  authMiddleware: MiddlewareHandler<AppContext>;
}

export function createUsersRoutes(options: UsersRoutesOptions) {
  const { usersService, authMiddleware } = options;
  const app = new Hono<AppContext>();

  // Apply auth middleware to all user routes
  app.use('*', authMiddleware);

  /**
   * GET /api/users/me
   * Get the current user's profile
   */
  app.get('/me', async (c) => {
    return c.json(await usersService.getMe(getAuthUser(c).userId));
  });

  // ============================================================================
  // Self-Profile Routes (for onboarding)
  // ============================================================================

  /**
   * GET /api/users/me/self-profile
   * Get the current user's self-profile external ID
   */
  app.get('/me/self-profile', async (c) => {
    const selfProfileId = await usersService.getSelfProfileId(getAuthUser(c).userId);
    return c.json({ selfProfileId });
  });

  /**
   * PUT /api/users/me/self-profile
   * Set an existing friend as the user's self-profile
   */
  app.put('/me/self-profile', async (c) => {
    const { friendId } = await parseBody(c, SelfProfileSetInputSchema);
    const selfProfileId = await usersService.setSelfProfile(getAuthUser(c).userId, friendId);

    return c.json({ selfProfileId });
  });

  /**
   * POST /api/users/me/self-profile
   * Create a new friend and set it as the user's self-profile
   * Used during onboarding
   */
  app.post('/me/self-profile', async (c) => {
    const input = await parseBody(c, FriendCreateInputSchema);
    const friend = await usersService.createSelfProfile(getAuthUser(c).userId, input);

    return c.json(friend, 201);
  });

  return app;
}
