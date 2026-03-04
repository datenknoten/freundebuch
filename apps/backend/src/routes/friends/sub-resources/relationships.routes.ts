import {
  type ErrorResponse,
  type Relationship,
  RelationshipInputSchema,
  RelationshipUpdateSchema,
} from '@freundebuch/shared/index.js';
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
 * POST /api/friends/:id/relationships
 * Add a relationship to a friend (creates inverse automatically)
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

  const validated = RelationshipInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  // Validate related_friend_id is a valid UUID
  if (!isValidUuid(validated.related_friend_id)) {
    throw new ValidationError('Invalid related friend ID');
  }

  // Prevent self-relationships
  if (validated.related_friend_id === friendId) {
    throw new ValidationError('Cannot create relationship with self');
  }

  const friendsService = new FriendsService(db, c.get('logger'));

  // Focused try-catch for unique constraint violation (duplicate relationship)
  let relationship: Relationship | null;
  try {
    relationship = await friendsService.addRelationship(user.userId, friendId, validated);
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique_relationship')) {
      return c.json<ErrorResponse>({ error: 'This relationship already exists' }, 409);
    }
    throw error;
  }

  if (!relationship) {
    throw new FriendNotFoundError();
  }

  return c.json(relationship, 201);
});

/**
 * PUT /api/friends/:id/relationships/:relationshipId
 * Update a relationship's notes
 */
app.put('/:relationshipId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const relationshipId = c.req.param('relationshipId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(relationshipId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = RelationshipUpdateSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const relationship = await friendsService.updateRelationship(
    user.userId,
    friendId,
    relationshipId,
    validated,
  );

  if (!relationship) {
    throw new ResourceNotFoundError('Relationship');
  }

  return c.json(relationship);
});

/**
 * DELETE /api/friends/:id/relationships/:relationshipId
 * Delete a relationship (and its inverse)
 */
app.delete('/:relationshipId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';
  const relationshipId = c.req.param('relationshipId') ?? '';

  if (!isValidUuid(friendId) || !isValidUuid(relationshipId)) {
    throw new ValidationError('Invalid ID');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteRelationship(user.userId, friendId, relationshipId);

  if (!deleted) {
    throw new ResourceNotFoundError('Relationship');
  }

  return c.json({ message: 'Relationship deleted successfully' });
});

export default app;
