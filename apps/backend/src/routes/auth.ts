import {
  type PreferencesResponse,
  UpdatePreferencesRequestSchema,
  type UserWithPreferencesResponse,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuth } from '../lib/auth.js';
import { authMiddleware, getAuthSession, getAuthUser } from '../middleware/auth.js';
import {
  getSelfProfileExternalId,
  getUserWithPreferences,
  updateUserPreferences,
} from '../models/queries/users.queries.js';
import type { AppContext } from '../types/context.js';
import { UserNotFoundError, ValidationError } from '../utils/errors.js';
import { parseUserPreferences, toJson } from '../utils/type-guards.js';

const app = new Hono<AppContext>();

/**
 * Mount Better Auth handler for all standard auth endpoints.
 * Better Auth handles: sign-in/email, sign-up/email, sign-out,
 * forget-password, reset-password, get-session, etc.
 */
app.on(['POST', 'GET'], '/*', async (c, next) => {
  // Check if this is a custom route we handle ourselves
  const path = new URL(c.req.url).pathname;
  const customPaths = ['/api/auth/me', '/api/auth/preferences'];
  if (customPaths.some((p) => path === p)) {
    return next();
  }

  // Delegate to Better Auth handler
  return getAuth().handler(c.req.raw);
});

/**
 * GET /api/auth/me
 * Get the current authenticated user with preferences.
 *
 * Uses the Better Auth session directly for user data (preferences, selfProfileId)
 * rather than querying the legacy auth.users table, since Better Auth user IDs
 * are not UUIDs and the legacy external_id column is UUID-typed.
 */
app.get('/me', authMiddleware, async (c) => {
  const db = c.get('db');
  const authUser = getAuthUser(c);

  // Use the session already resolved by authMiddleware (no second getSession() call)
  const session = getAuthSession(c);

  if (!session?.user) {
    throw new UserNotFoundError();
  }

  // Look up the self-profile external_id from the friends table directly,
  // using the internal self_profile_id from the Better Auth session.
  // We avoid querying auth.users here because Better Auth user IDs are not
  // UUIDs and the legacy external_id column is UUID-typed.
  let selfProfileExternalId: string | null = null;
  if (session.user.selfProfileId) {
    const result = await getSelfProfileExternalId.run(
      { selfProfileId: session.user.selfProfileId },
      db,
    );
    selfProfileExternalId = result[0]?.self_profile_external_id ?? null;
  }

  const response: UserWithPreferencesResponse = {
    user: {
      externalId: authUser.betterAuthId,
      email: authUser.email,
      selfProfileId: selfProfileExternalId ?? undefined,
      hasCompletedOnboarding: selfProfileExternalId !== null,
    },
    preferences: parseUserPreferences(session.user.preferences ?? {}),
  };

  return c.json(response);
});

/**
 * PATCH /api/auth/preferences
 * Update user preferences
 */
app.patch('/preferences', authMiddleware, async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const authUser = getAuthUser(c);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = UpdatePreferencesRequestSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  // Get current preferences
  const users = await getUserWithPreferences.run({ externalId: authUser.betterAuthId }, db);

  if (users.length === 0) {
    throw new UserNotFoundError();
  }

  const user = users[0];
  if (!user) {
    throw new UserNotFoundError();
  }

  // Merge with existing preferences
  const currentPreferences = parseUserPreferences(user.preferences ?? {});
  const newPreferences = {
    ...currentPreferences,
    ...validated,
  };

  // Update in database
  const result = await updateUserPreferences.run(
    {
      externalId: authUser.betterAuthId,
      preferences: toJson(newPreferences),
    },
    db,
  );

  if (result.length === 0) {
    throw new UserNotFoundError();
  }

  logger.info({ userId: authUser.userId }, 'User preferences updated');

  return c.json<PreferencesResponse>({
    preferences: parseUserPreferences(result[0]?.preferences),
  });
});

export default app;
