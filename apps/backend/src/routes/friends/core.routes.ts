import { ValidationError } from '@datenknoten/kit';
import {
  FriendCreateInputSchema,
  FriendListQuerySchema,
  type FriendUpdateInput,
  FriendUpdateInputSchema,
  parseFriendListQuery,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import type { FriendsService, FriendUpdateData } from '../../services/friends/friends.service.js';
import type { AppContext } from '../../types/context.js';
import { parseBody } from '../../utils/parse-body.js';
import { requireUuidParam } from '../../utils/require-uuid-param.js';
import { mapFriendCreateInput } from '../mappers/map-friend-create-input.js';

export interface CoreRoutesOptions {
  friendsService: FriendsService;
}

function mapFriendUpdateInput(input: FriendUpdateInput) {
  const data: FriendUpdateData = {};
  if ('display_name' in input) {
    data.displayName = input.display_name;
  }
  if ('nickname' in input) {
    data.nickname = input.nickname;
  }
  if ('name_prefix' in input) {
    data.namePrefix = input.name_prefix;
  }
  if ('name_first' in input) {
    data.nameFirst = input.name_first;
  }
  if ('name_middle' in input) {
    data.nameMiddle = input.name_middle;
  }
  if ('name_last' in input) {
    data.nameLast = input.name_last;
  }
  if ('name_suffix' in input) {
    data.nameSuffix = input.name_suffix;
  }
  if ('maiden_name' in input) {
    data.maidenName = input.maiden_name;
  }
  if ('interests' in input) {
    data.interests = input.interests;
  }
  return data;
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

    const friend = await options.friendsService.getFriend(user.userId, friendId);

    return c.json(friend);
  });

  /**
   * POST /api/friends
   * Create a new friend
   */
  app.post('/', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, FriendCreateInputSchema);

    const friend = await options.friendsService.createFriend(
      user.userId,
      mapFriendCreateInput(validated),
    );

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

    const friend = await options.friendsService.updateFriend(
      user.userId,
      friendId,
      mapFriendUpdateInput(validated),
    );

    return c.json(friend);
  });

  /**
   * DELETE /api/friends/:id
   * Soft delete a friend and remove associated photo files
   */
  app.delete('/:id', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    await options.friendsService.deleteFriend(user.userId, friendId);

    // Photo cleanup now happens inside deleteFriend so all callers get it.
    return c.json({ message: 'Friend deleted successfully' });
  });

  return app;
}
