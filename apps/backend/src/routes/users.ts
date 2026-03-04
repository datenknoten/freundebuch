import {
  FriendCreateSchema,
  UpdateProfileRequestSchema,
  type User,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import {
  getUserByEmailWithSelfProfile,
  getUserSelfProfile,
  setUserSelfProfile,
  updateUserReturningWithSelfProfile,
} from '../models/queries/users.queries.js';
import { FriendsService } from '../services/friends.service.js';
import type { AppContext } from '../types/context.js';
import { UserNotFoundError, ValidationError } from '../utils/errors.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all user routes
app.use('*', authMiddleware);

/**
 * GET /api/users/me
 * Get the current user's profile
 */
app.get('/me', async (c) => {
  const db = c.get('db');

  const authUser = getAuthUser(c);
  // Single query to get user with self-profile info
  const [user] = await getUserByEmailWithSelfProfile.run({ email: authUser.email }, db);

  if (!user) {
    throw new UserNotFoundError();
  }

  const selfProfileExternalId = user.self_profile_external_id;

  return c.json<User>({
    externalId: user.external_id,
    email: user.email,
    createdAt: user.created_at.toISOString(),
    updatedAt: user.updated_at.toISOString(),
    selfProfileId: selfProfileExternalId ?? undefined,
    hasCompletedOnboarding: selfProfileExternalId !== null,
  });
});

/**
 * PUT /api/users/me
 * Update the current user's profile
 */
app.put('/me', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const authUser = getAuthUser(c);
  const body = await c.req.json();
  const validated = UpdateProfileRequestSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  // If no email update, return current user (single query)
  if (!validated.email) {
    const [user] = await getUserByEmailWithSelfProfile.run({ email: authUser.email }, db);

    if (!user) {
      throw new UserNotFoundError();
    }

    const selfProfileExternalId = user.self_profile_external_id;

    return c.json<User>({
      externalId: user.external_id,
      email: user.email,
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
      selfProfileId: selfProfileExternalId ?? undefined,
      hasCompletedOnboarding: selfProfileExternalId !== null,
    });
  }

  // Update user email and return with self-profile info (single query)
  const [updatedUser] = await updateUserReturningWithSelfProfile.run(
    {
      externalId: authUser.userId,
      email: validated.email,
    },
    db,
  );

  if (!updatedUser) {
    throw new Error('Failed to update user');
  }

  logger.info({ userId: authUser.userId, newEmail: validated.email }, 'User profile updated');

  const selfProfileExternalId = updatedUser.self_profile_external_id;

  return c.json<User>({
    externalId: updatedUser.external_id,
    email: updatedUser.email,
    createdAt: updatedUser.created_at.toISOString(),
    updatedAt: updatedUser.updated_at.toISOString(),
    selfProfileId: selfProfileExternalId ?? undefined,
    hasCompletedOnboarding: selfProfileExternalId !== null,
  });
});

// ============================================================================
// Self-Profile Routes (for onboarding)
// ============================================================================

/**
 * GET /api/users/me/self-profile
 * Get the current user's self-profile external ID
 */
app.get('/me/self-profile', async (c) => {
  const db = c.get('db');

  const authUser = getAuthUser(c);
  const result = await getUserSelfProfile.run({ userExternalId: authUser.userId }, db);
  const selfProfileExternalId = result[0]?.self_profile_external_id ?? null;

  return c.json({ selfProfileId: selfProfileExternalId });
});

/**
 * PUT /api/users/me/self-profile
 * Set an existing friend as the user's self-profile
 */
app.put('/me/self-profile', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const authUser = getAuthUser(c);
  const body = await c.req.json();

  const SetSelfProfileSchema = type({ friendId: 'string.uuid' });
  const validated = SetSelfProfileSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const result = await setUserSelfProfile.run(
    {
      userExternalId: authUser.userId,
      friendExternalId: validated.friendId,
    },
    db,
  );

  if (result.length === 0) {
    throw new UserNotFoundError('Friend not found or does not belong to user');
  }

  logger.info(
    { userId: authUser.userId, friendId: validated.friendId },
    'Self-profile set successfully',
  );

  return c.json({ selfProfileId: result[0]?.self_profile_external_id });
});

/**
 * POST /api/users/me/self-profile
 * Create a new friend and set it as the user's self-profile
 * Used during onboarding
 */
app.post('/me/self-profile', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  const authUser = getAuthUser(c);
  const body = await c.req.json();

  const validated = FriendCreateSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  // Check if user already has a self-profile
  const existingResult = await getUserSelfProfile.run({ userExternalId: authUser.userId }, db);
  if (existingResult[0]?.self_profile_external_id) {
    throw new ValidationError('Self-profile already exists');
  }

  // Create the friend
  const friendsService = new FriendsService(db, logger);
  const newFriend = await friendsService.createFriend(authUser.userId, validated);

  // Set it as the self-profile
  const setResult = await setUserSelfProfile.run(
    {
      userExternalId: authUser.userId,
      friendExternalId: newFriend.id,
    },
    db,
  );

  if (setResult.length === 0) {
    throw new Error('Failed to set self-profile after creation');
  }

  logger.info(
    { userId: authUser.userId, friendId: newFriend.id },
    'Self-profile created and set successfully',
  );

  return c.json(newFriend, 201);
});

export default app;
