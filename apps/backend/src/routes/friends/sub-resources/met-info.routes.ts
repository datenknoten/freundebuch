import { MetInfoInputSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import { ResourceNotFoundError } from '../../../errors/resource-not-found.error.js';
import { getAuthUser } from '../../../middleware/auth.js';
import type { FriendsService } from '../../../services/friends/friends.service.js';
import type { AppContext } from '../../../types/context.js';
import { parseBody } from '../../../utils/parse-body.js';
import { requireUuidParam } from '../../../utils/require-uuid-param.js';

export interface MetInfoRoutesOptions {
  friendsService: FriendsService;
}

export function createMetInfoRoutes(options: MetInfoRoutesOptions): Hono<AppContext> {
  const app = new Hono<AppContext>();

  /**
   * PUT /api/friends/:id/met-info
   * Set or update how/where met information (upsert)
   */
  app.put('/', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');
    const validated = await parseBody(c, MetInfoInputSchema);

    const metInfo = await options.friendsService.setMetInfo(user.userId, friendId, validated);

    if (!metInfo) {
      throw new FriendNotFoundError(friendId);
    }

    return c.json(metInfo);
  });

  /**
   * DELETE /api/friends/:id/met-info
   * Delete how/where met information
   */
  app.delete('/', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const isDeleted = await options.friendsService.deleteMetInfo(user.userId, friendId);

    if (!isDeleted) {
      throw new ResourceNotFoundError('Met info', friendId);
    }

    return c.json({ message: 'Met info deleted successfully' });
  });

  return app;
}
