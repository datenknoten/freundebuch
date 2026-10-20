import { ValidationError } from '@datenknoten/kit';
import {
  RelationshipCreateInputSchema,
  RelationshipUpdateInputSchema,
} from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import { ResourceNotFoundError } from '../../../errors/resource-not-found.error.js';
import { getAuthUser } from '../../../middleware/auth.js';
import type { FriendsService } from '../../../services/friends/friends.service.js';
import type { AppContext } from '../../../types/context.js';
import { parseBody } from '../../../utils/parse-body.js';
import { requireUuidParam } from '../../../utils/require-uuid-param.js';

export interface RelationshipsRoutesOptions {
  friendsService: FriendsService;
}

export function createRelationshipsRoutes(options: RelationshipsRoutesOptions): Hono<AppContext> {
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
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');
    const validated = await parseBody(c, RelationshipCreateInputSchema);

    // Prevent self-relationships
    if (validated.related_friend_id === friendId) {
      throw new ValidationError('Cannot create relationship with self');
    }

    // A duplicate pair surfaces as ConflictError from the service, which the
    // global handler renders as 409 { error, code: 'CONFLICT' }.
    const relationship = await options.friendsService.addRelationship(
      user.userId,
      friendId,
      validated,
    );

    if (!relationship) {
      throw new FriendNotFoundError(friendId);
    }

    return c.json(relationship, 201);
  });

  /**
   * PUT /api/friends/:id/relationships/:relationshipId
   * Update a relationship's notes
   */
  app.put('/:relationshipId', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id');
    const relationshipId = requireUuidParam(c, 'relationshipId');
    const validated = await parseBody(c, RelationshipUpdateInputSchema);

    const relationship = await options.friendsService.updateRelationship(
      user.userId,
      friendId,
      relationshipId,
      validated,
    );

    if (!relationship) {
      throw new ResourceNotFoundError('Relationship', relationshipId);
    }

    return c.json(relationship);
  });

  /**
   * DELETE /api/friends/:id/relationships/:relationshipId
   * Delete a relationship (and its inverse)
   */
  app.delete('/:relationshipId', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id');
    const relationshipId = requireUuidParam(c, 'relationshipId');

    const isDeleted = await options.friendsService.deleteRelationship(
      user.userId,
      friendId,
      relationshipId,
    );

    if (!isDeleted) {
      throw new ResourceNotFoundError('Relationship', relationshipId);
    }

    return c.json({ message: 'Relationship deleted successfully' });
  });

  return app;
}
