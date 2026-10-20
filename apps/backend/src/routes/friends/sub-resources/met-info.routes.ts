import { MetInfoInputSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import type { FriendsService } from '../../../services/friends/friends.service.js';
import type { AppContext } from '../../../types/context.js';
import { parseBody } from '../../../utils/parse-body.js';
import { requireUuidParam } from '../../../utils/require-uuid-param.js';
import { mapMetInfoInput } from '../../mappers/map-met-info-input.js';

export interface MetInfoRoutesOptions {
  friendsService: FriendsService;
}

export function createMetInfoRoutes(options: MetInfoRoutesOptions) {
  const app = new Hono<AppContext>();

  // Upsert
  app.put('/', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');
    const data = mapMetInfoInput(await parseBody(c, MetInfoInputSchema));

    return c.json(await options.friendsService.setMetInfo(user.userId, friendId, data));
  });

  app.delete('/', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    await options.friendsService.deleteMetInfo(user.userId, friendId);

    return c.json({ message: 'Met info deleted successfully' });
  });

  return app;
}
