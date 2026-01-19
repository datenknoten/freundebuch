import { type ErrorResponse, SocialProfileInputSchema } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import { toError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/social-profiles
 * Add a social profile to a friend
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = SocialProfileInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const profile = await friendsService.addSocialProfile(user.userId, friendId, validated);

    if (!profile) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(profile, 201);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add social profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add social profile' }, 500);
  }
});

/**
 * PUT /api/friends/:id/social-profiles/:profileId
 * Update a social profile
 */
app.put('/:profileId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const profileId = c.req.param('profileId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(profileId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = SocialProfileInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const profile = await friendsService.updateSocialProfile(
      user.userId,
      friendId,
      profileId,
      validated,
    );

    if (!profile) {
      return c.json<ErrorResponse>({ error: 'Social profile not found' }, 404);
    }

    return c.json(profile);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, profileId }, 'Failed to update social profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update social profile' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/social-profiles/:profileId
 * Delete a social profile
 */
app.delete('/:profileId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const profileId = c.req.param('profileId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(profileId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteSocialProfile(user.userId, friendId, profileId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Social profile not found' }, 404);
    }

    return c.json({ message: 'Social profile deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, profileId }, 'Failed to delete social profile');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete social profile' }, 500);
  }
});

export default app;
