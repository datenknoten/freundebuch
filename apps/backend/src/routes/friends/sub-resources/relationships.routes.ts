import { ValidationError } from '@datenknoten/kit';
import {
  type RelationshipCreateInput,
  RelationshipCreateInputSchema,
  type RelationshipUpdateInput,
  RelationshipUpdateInputSchema,
} from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import type { FriendsService } from '../../../services/friends/friends.service.js';
import type { RelationshipUpdateData } from '../../../services/friends/relationship.service.js';
import type { AppContext } from '../../../types/context.js';
import { parseBody } from '../../../utils/parse-body.js';
import { requireUuidParam } from '../../../utils/require-uuid-param.js';

export interface RelationshipsRoutesOptions {
  friendsService: FriendsService;
}

function mapRelationshipCreateInput(input: RelationshipCreateInput) {
  return {
    relatedFriendId: input.related_friend_id,
    relationshipTypeId: input.relationship_type_id,
    notes: input.notes,
  };
}

function mapRelationshipUpdateInput(input: RelationshipUpdateInput) {
  const data: RelationshipUpdateData = {};
  if ('notes' in input) {
    data.notes = input.notes;
  }
  return data;
}

export function createRelationshipsRoutes(options: RelationshipsRoutesOptions) {
  const app = new Hono<AppContext>();

  // Hand-written rather than generated: the pair is symmetric (self-relationships
  // are rejected, and the inverse edge is created in the same transaction), so it
  // does not fit the sub-resource shape.
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
      mapRelationshipCreateInput(validated),
    );

    return c.json(relationship, 201);
  });

  app.put('/:relationshipId', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id');
    const relationshipId = requireUuidParam(c, 'relationshipId');
    const validated = await parseBody(c, RelationshipUpdateInputSchema);

    const relationship = await options.friendsService.updateRelationship(
      user.userId,
      friendId,
      relationshipId,
      mapRelationshipUpdateInput(validated),
    );

    return c.json(relationship);
  });

  // Also deletes the inverse
  app.delete('/:relationshipId', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id');
    const relationshipId = requireUuidParam(c, 'relationshipId');

    await options.friendsService.deleteRelationship(user.userId, friendId, relationshipId);

    return c.json({ message: 'Relationship deleted successfully' });
  });

  return app;
}
