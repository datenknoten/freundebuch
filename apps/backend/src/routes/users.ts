import {
  type ErrorResponse,
  type FriendCreateInput,
  FriendCreateSchema,
  UpdateProfileRequestSchema,
  type User,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
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
import { toError } from '../utils/errors.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all user routes
app.use('*', authMiddleware);

/**
 * GET /api/users/me
 * Get the current user's profile
 */
app.get('/me', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    // Single query to get user with self-profile info
    const [user] = await getUserByEmailWithSelfProfile.run({ email: authUser.email }, db);

    if (!user) {
      logger.error({ userId: authUser.userId }, 'User not found');
      return c.json<ErrorResponse>({ error: 'User not found' }, 404);
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
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get user profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get user profile' }, 500);
  }
});

/**
 * PUT /api/users/me
 * Update the current user's profile
 */
app.put('/me', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const body = await c.req.json();
    const validated = UpdateProfileRequestSchema(body);

    if (validated instanceof type.errors) {
      logger.warn({ body, errors: validated }, 'Invalid update profile request');
      return c.json<ErrorResponse>(
        {
          error: 'Invalid request',
          details: validated,
        },
        400,
      );
    }

    // If no email update, return current user (single query)
    if (!validated.email) {
      const [user] = await getUserByEmailWithSelfProfile.run({ email: authUser.email }, db);

      if (!user) {
        return c.json<ErrorResponse>({ error: 'User not found' }, 404);
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
      logger.error({ userId: authUser.userId }, 'Failed to update user');
      return c.json<ErrorResponse>({ error: 'Failed to update user' }, 500);
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
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to update user profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update user profile' }, 500);
  }
});

// ============================================================================
// Self-Profile Routes (for onboarding)
// ============================================================================

/**
 * GET /api/users/me/self-profile
 * Get the current user's self-profile external ID
 */
app.get('/me/self-profile', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const result = await getUserSelfProfile.run({ userExternalId: authUser.userId }, db);
    const selfProfileExternalId = result[0]?.self_profile_external_id ?? null;

    return c.json({ selfProfileId: selfProfileExternalId });
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to get self-profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get self-profile' }, 500);
  }
});

/**
 * PUT /api/users/me/self-profile
 * Set an existing friend as the user's self-profile
 */
app.put('/me/self-profile', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const body = await c.req.json();

    const SetSelfProfileSchema = type({ friendId: 'string.uuid' });
    const validated = SetSelfProfileSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const result = await setUserSelfProfile.run(
      {
        userExternalId: authUser.userId,
        friendExternalId: validated.friendId,
      },
      db,
    );

    if (result.length === 0) {
      return c.json<ErrorResponse>({ error: 'Friend not found or does not belong to user' }, 404);
    }

    logger.info(
      { userId: authUser.userId, friendId: validated.friendId },
      'Self-profile set successfully',
    );

    return c.json({ selfProfileId: result[0]?.self_profile_external_id });
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to set self-profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to set self-profile' }, 500);
  }
});

/**
 * POST /api/users/me/self-profile
 * Create a new friend and set it as the user's self-profile
 * Used during onboarding
 */
app.post('/me/self-profile', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');

  try {
    const authUser = getAuthUser(c);
    const body = await c.req.json();

    const validated = FriendCreateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    // Check if user already has a self-profile
    const existingResult = await getUserSelfProfile.run({ userExternalId: authUser.userId }, db);
    if (existingResult[0]?.self_profile_external_id) {
      return c.json<ErrorResponse>({ error: 'Self-profile already exists' }, 409);
    }

    // Create the friend
    const friendsService = new FriendsService(db, logger);
    const newFriend = await friendsService.createFriend(
      authUser.userId,
      validated as FriendCreateInput,
    );

    // Set it as the self-profile
    const setResult = await setUserSelfProfile.run(
      {
        userExternalId: authUser.userId,
        friendExternalId: newFriend.id,
      },
      db,
    );

    if (setResult.length === 0) {
      logger.error(
        { userId: authUser.userId, friendId: newFriend.id },
        'Failed to set self-profile after creation',
      );
      return c.json<ErrorResponse>({ error: 'Failed to set self-profile' }, 500);
    }

    logger.info(
      { userId: authUser.userId, friendId: newFriend.id },
      'Self-profile created and set successfully',
    );

    return c.json(newFriend, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to create self-profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to create self-profile' }, 500);
  }
});

export default app;
