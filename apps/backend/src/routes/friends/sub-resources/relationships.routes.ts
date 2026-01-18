import {
  type ErrorResponse,
  RelationshipInputSchema,
  RelationshipUpdateSchema,
} from '@freundebuch/shared/index.js';
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
 * POST /api/friends/:id/relationships
 * Add a relationship to a friend (creates inverse automatically)
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;

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

    const validated = RelationshipInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    // Validate related_friend_id is a valid UUID
    if (!isValidUuid(validated.related_friend_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid related friend ID' }, 400);
    }

    // Prevent self-relationships
    if (validated.related_friend_id === friendId) {
      return c.json<ErrorResponse>({ error: 'Cannot create relationship with self' }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const relationship = await friendsService.addRelationship(user.userId, friendId, validated);

    if (!relationship) {
      return c.json<ErrorResponse>({ error: 'Friend not found' }, 404);
    }

    return c.json(relationship, 201);
  } catch (error) {
    // Handle unique constraint violation (duplicate relationship)
    if (error instanceof Error && error.message.includes('unique_relationship')) {
      return c.json<ErrorResponse>({ error: 'Relationship already exists' }, 409);
    }
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to add relationship');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add relationship' }, 500);
  }
});

/**
 * PUT /api/friends/:id/relationships/:relationshipId
 * Update a relationship's notes
 */
app.put('/:relationshipId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const relationshipId = c.req.param('relationshipId')!;

  if (!isValidUuid(friendId) || !isValidUuid(relationshipId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = RelationshipUpdateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const friendsService = new FriendsService(db, logger);
    const relationship = await friendsService.updateRelationship(
      user.userId,
      friendId,
      relationshipId,
      validated,
    );

    if (!relationship) {
      return c.json<ErrorResponse>({ error: 'Relationship not found' }, 404);
    }

    return c.json(relationship);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, relationshipId }, 'Failed to update relationship');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update relationship' }, 500);
  }
});

/**
 * DELETE /api/friends/:id/relationships/:relationshipId
 * Delete a relationship (and its inverse)
 */
app.delete('/:relationshipId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id')!;
  const relationshipId = c.req.param('relationshipId')!;

  if (!isValidUuid(friendId) || !isValidUuid(relationshipId)) {
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const friendsService = new FriendsService(db, logger);
    const deleted = await friendsService.deleteRelationship(user.userId, friendId, relationshipId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Relationship not found' }, 404);
    }

    return c.json({ message: 'Relationship deleted successfully' });
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId, relationshipId }, 'Failed to delete relationship');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete relationship' }, 500);
  }
});

export default app;
