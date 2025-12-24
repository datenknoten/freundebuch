import {
  type ErrorResponse,
  UpdateProfileRequestSchema,
  type User,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { getUserByEmail, updateUser } from '../models/queries/users.queries.js';
import type { AppContext } from '../types/context.js';

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
    const users = await getUserByEmail.run({ email: authUser.email }, db);

    if (users.length === 0) {
      logger.error({ userId: authUser.userId }, 'User not found');
      return c.json<ErrorResponse>({ error: 'User not found' }, 404);
    }

    const user = users[0];

    if (!user) {
      return c.json<ErrorResponse>({ error: 'User not found' }, 404);
    }

    return c.json<User>({
      externalId: user.external_id,
      email: user.email,
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get user profile');
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

    // If no email update, return current user
    if (!validated.email) {
      const users = await getUserByEmail.run({ email: authUser.email }, db);
      const user = users[0];

      if (!user) {
        return c.json<ErrorResponse>({ error: 'User not found' }, 404);
      }

      return c.json<User>({
        externalId: user.external_id,
        email: user.email,
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at.toISOString(),
      });
    }

    // Update user email
    const [updatedUser] = await updateUser.run(
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

    return c.json<User>({
      externalId: updatedUser.external_id,
      email: updatedUser.email,
      createdAt: updatedUser.created_at.toISOString(),
      updatedAt: updatedUser.updated_at.toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to update user profile');
    return c.json<ErrorResponse>({ error: 'Failed to update user profile' }, 500);
  }
});

export default app;
