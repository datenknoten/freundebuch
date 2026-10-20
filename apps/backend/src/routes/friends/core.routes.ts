import { ValidationError } from '@datenknoten/kit';
import {
  FriendCreateInputSchema,
  FriendListQuerySchema,
  FriendUpdateInputSchema,
  parseFriendListQuery,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { FriendNotFoundError } from '../../errors/friend-not-found.error.js';
import { getAuthUser } from '../../middleware/auth.js';
import type { FriendsService } from '../../services/friends/friends.service.js';
import type { AppContext } from '../../types/context.js';
import { parseBody } from '../../utils/parse-body.js';
import { requireUuidParam } from '../../utils/require-uuid-param.js';

export interface CoreRoutesOptions {
  friendsService: FriendsService;
}

export function createCoreRoutes(options: CoreRoutesOptions): Hono<AppContext> {
  const app = new Hono<AppContext>();

  /**
   * GET /api/friends
   * List friends with pagination and sorting
   */
  app.get('/', async (c) => {
    const user = getAuthUser(c);

    const queryParams = c.req.query();
    const validated = FriendListQuerySchema(queryParams);

    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    const listOptions = parseFriendListQuery(validated);
    const result = await options.friendsService.listFriends(user.userId, listOptions);

    return c.json(result);
  });

  /**
   * GET /api/friends/:id
   * Get a single friend with all related data
   */
  app.get('/:id', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const friend = await options.friendsService.getFriendById(user.userId, friendId);

    if (!friend) {
      throw new FriendNotFoundError(friendId);
    }

    return c.json(friend);
  });

  /**
   * POST /api/friends
   * Create a new friend
   */
  app.post('/', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, FriendCreateInputSchema);

    const friend = await options.friendsService.createFriend(user.userId, validated);

    return c.json(friend, 201);
  });

  /**
   * PUT /api/friends/:id
   * Update an existing friend
   */
  app.put('/:id', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');
    const validated = await parseBody(c, FriendUpdateInputSchema);

    const friend = await options.friendsService.updateFriend(user.userId, friendId, validated);

    if (!friend) {
      throw new FriendNotFoundError(friendId);
    }

    return c.json(friend);
  });

  /**
   * DELETE /api/friends/:id
   * Soft delete a friend and remove associated photo files
   */
  app.delete('/:id', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const isDeleted = await options.friendsService.deleteFriend(user.userId, friendId);

    if (!isDeleted) {
      throw new FriendNotFoundError(friendId);
    }

    // Photo cleanup now happens inside deleteFriend so all callers get it.
    return c.json({ message: 'Friend deleted successfully' });
  });

  return app;
}
