import { RelationshipInputSchema, RelationshipUpdateSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { FriendsService } from '../../../services/friends/index.js';
import type { AppContext } from '../../../types/context.js';
import {
  FriendNotFoundError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../utils/errors.js';
import { parseBody, requireUuidParam } from '../../../utils/http.js';

const app = new Hono<AppContext>();

/**
 * POST /api/friends/:id/relationships
 * Add a relationship to a friend (creates inverse automatically)
 *
 * Hand-written rather than generated: the pair is symmetric (self-relationships
 * are rejected, and the inverse edge is created in the same transaction), so it
 * does not fit the sub-resource shape.
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');
  const validated = await parseBody(c, RelationshipInputSchema);

  // Prevent self-relationships
  if (validated.related_friend_id === friendId) {
    throw new ValidationError('Cannot create relationship with self');
  }

  const friendsService = new FriendsService(db, c.get('logger'));
  // A duplicate pair surfaces as ConflictError from the service, which the
  // global handler renders as 409 { error, code: 'CONFLICT' }.
  const relationship = await friendsService.addRelationship(user.userId, friendId, validated);

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
  const friendId = requireUuidParam(c, 'id');
  const relationshipId = requireUuidParam(c, 'relationshipId');
  const validated = await parseBody(c, RelationshipUpdateSchema);

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
  const friendId = requireUuidParam(c, 'id');
  const relationshipId = requireUuidParam(c, 'relationshipId');

  const friendsService = new FriendsService(db, c.get('logger'));
  const deleted = await friendsService.deleteRelationship(user.userId, friendId, relationshipId);

  if (!deleted) {
    throw new ResourceNotFoundError('Relationship');
  }

  return c.json({ message: 'Relationship deleted successfully' });
});

export default app;
