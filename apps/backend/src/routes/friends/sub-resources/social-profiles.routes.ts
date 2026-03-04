import { SocialProfileInputSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import {
  FriendNotFoundError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/social-profiles
 * Add a social profile to a friend
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = SocialProfileInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const profile = await friendsService.addSocialProfile(user.userId, friendId, validated);

  if (!profile) {
    throw new FriendNotFoundError();
  }

  return c.json(profile, 201);
});

/**
 * PUT /api/friends/:id/social-profiles/:profileId
 * Update a social profile
 */
app.put('/:profileId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const profileId = c.req.param('profileId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(profileId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = SocialProfileInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const profile = await friendsService.updateSocialProfile(
    user.userId,
    friendId,
    profileId,
    validated,
  );

  if (!profile) {
    throw new ResourceNotFoundError('Social profile');
  }

  return c.json(profile);
});

/**
 * DELETE /api/friends/:id/social-profiles/:profileId
 * Delete a social profile
 */
app.delete('/:profileId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const profileId = c.req.param('profileId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(profileId)) {
    throw new ValidationError('Invalid ID');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteSocialProfile(user.userId, friendId, profileId);

  if (!deleted) {
    throw new ResourceNotFoundError('Social profile');
  }

  return c.json({ message: 'Social profile deleted successfully' });
});

export default app;
