import { FriendCreateInputSchema, SelfProfileSetInputSchema } from '@freundebuch/shared/index.js';
import { Hono, type MiddlewareHandler } from 'hono';
import { getAuthUser } from '../middleware/auth.js';
import type { UsersService } from '../services/users.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { mapFriendCreateInput } from './mappers/map-friend-create-input.js';

export interface UsersRoutesOptions {
  usersService: UsersService;
  authMiddleware: MiddlewareHandler<AppContext>;
}

export function createUsersRoutes(options: UsersRoutesOptions) {
  const { usersService, authMiddleware } = options;
  const app = new Hono<AppContext>();

  app.use('*', authMiddleware);

  app.get('/me', async (c) => {
    return c.json(await usersService.getMe(getAuthUser(c).userId));
  });

  //#region Self-profile (onboarding)

  app.get('/me/self-profile', async (c) => {
    const selfProfileId = await usersService.getSelfProfileId(getAuthUser(c).userId);
    return c.json({ selfProfileId });
  });

  // Sets an existing friend as the self-profile
  app.put('/me/self-profile', async (c) => {
    const { friendId } = await parseBody(c, SelfProfileSetInputSchema);
    const selfProfileId = await usersService.setSelfProfile(getAuthUser(c).userId, friendId);

    return c.json({ selfProfileId });
  });

  // Creates a new friend as the self-profile, during onboarding
  app.post('/me/self-profile', async (c) => {
    const input = await parseBody(c, FriendCreateInputSchema);
    const friend = await usersService.createSelfProfile(
      getAuthUser(c).userId,
      mapFriendCreateInput(input),
    );

    return c.json(friend, 201);
  });

  //#endregion

  return app;
}
