import { ConflictError } from '@datenknoten/kit';
import type {
  FriendSearchResultResponse,
  RelationshipResponse,
  RelationshipTypeId,
  RelationshipTypeResponse,
  RelationshipTypesGroupedResponse,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { FriendNotFoundError } from '../../errors/friend-not-found.error.js';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error.js';
import {
  createInverseRelationship,
  createRelationship,
  deleteInverseRelationship,
  deleteRelationship,
  getAllRelationshipTypes,
  getRelationshipById,
  type IGetRelationshipsByFriendIdResult,
  searchFriends,
  updateRelationship,
} from '../../models/queries/friend-relationships.queries.js';
import { createWildcardQuery } from '../../utils/create-wildcard-query.js';
import { parseRelationshipCategory } from '../../utils/parse-relationship-category.js';
import { parseRelationshipTypeId } from '../../utils/parse-relationship-type-id.js';
import { toUniqueViolationError } from '../../utils/to-unique-violation-error.js';
import { withTransaction } from '../../utils/with-transaction.js';

export interface RelationshipServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

export interface RelationshipCreateData {
  relatedFriendId: string;
  relationshipTypeId: RelationshipTypeId;
  notes?: string;
}

export interface RelationshipUpdateData {
  notes?: string | null;
}

function relationshipExists() {
  return new ConflictError('This relationship already exists');
}

async function insertRelationshipPair(
  client: pg.PoolClient,
  userExternalId: string,
  friendExternalId: string,
  data: RelationshipCreateData,
) {
  const [relationship] = await createRelationship.run(
    {
      userExternalId,
      friendExternalId,
      relatedFriendExternalId: data.relatedFriendId,
      relationshipTypeId: data.relationshipTypeId,
      notes: data.notes ?? null,
    },
    client,
  );

  if (relationship === undefined) {
    throw new FriendNotFoundError(friendExternalId);
  }

  // The inverse type may not exist; the query then inserts nothing.
  await createInverseRelationship.run(
    {
      userExternalId,
      friendExternalId,
      relatedFriendExternalId: data.relatedFriendId,
      relationshipTypeId: data.relationshipTypeId,
      notes: data.notes ?? null,
    },
    client,
  );

  return relationship.external_id;
}

export class RelationshipService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;

  constructor(options: RelationshipServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  public async getRelationshipTypes() {
    this.logger.debug('Getting relationship types');

    const types = await getAllRelationshipTypes.run(undefined, this.db);

    const grouped: RelationshipTypesGroupedResponse = {
      family: [],
      professional: [],
      social: [],
    };

    for (const t of types) {
      const relationshipType: RelationshipTypeResponse = {
        id: parseRelationshipTypeId(t.id),
        category: parseRelationshipCategory(t.category),
        label: t.label,
        inverseTypeId: parseRelationshipTypeId(t.inverse_type_id ?? t.id),
      };

      if (t.category === 'family') {
        grouped.family.push(relationshipType);
      } else if (t.category === 'professional') {
        grouped.professional.push(relationshipType);
      } else if (t.category === 'social') {
        grouped.social.push(relationshipType);
      }
    }

    return grouped;
  }

  /** Creates the inverse relationship as well. */
  public async addRelationship(
    userExternalId: string,
    friendExternalId: string,
    data: RelationshipCreateData,
  ) {
    this.logger.debug(
      { friendExternalId, relatedFriendExternalId: data.relatedFriendId },
      'Adding relationship',
    );

    // The primary relationship and its inverse must be created together; a
    // failure in between previously left a one-way edge.
    let relationshipExternalId: string;
    try {
      relationshipExternalId = await withTransaction(this.db, (client) =>
        insertRelationshipPair(client, userExternalId, friendExternalId, data),
      );
    } catch (error) {
      // A pair can only be related once by a given type.
      throw toUniqueViolationError(error, { unique_relationship: relationshipExists });
    }

    const [fullRelationship] = await getRelationshipById.run(
      {
        userExternalId,
        friendExternalId,
        relationshipExternalId,
      },
      this.db,
    );

    if (fullRelationship === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }

    this.logger.info(
      {
        friendExternalId,
        relatedFriendExternalId: data.relatedFriendId,
        relationshipType: data.relationshipTypeId,
      },
      'Relationship created successfully',
    );

    return this.mapRelationship(fullRelationship);
  }

  public async updateRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
    data: RelationshipUpdateData,
  ) {
    this.logger.debug({ friendExternalId, relationshipExternalId }, 'Updating relationship');

    const [updated] = await updateRelationship.run(
      {
        userExternalId,
        friendExternalId,
        relationshipExternalId,
        notes: data.notes ?? null,
      },
      this.db,
    );

    if (updated === undefined) {
      throw new ResourceNotFoundError('Relationship', relationshipExternalId);
    }

    const [fullRelationship] = await getRelationshipById.run(
      {
        userExternalId,
        friendExternalId,
        relationshipExternalId,
      },
      this.db,
    );

    if (fullRelationship === undefined) {
      throw new ResourceNotFoundError('Relationship', relationshipExternalId);
    }

    this.logger.info({ friendExternalId, relationshipExternalId }, 'Relationship updated');

    return this.mapRelationship(fullRelationship);
  }

  /** Deletes the inverse relationship as well. */
  public async deleteRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
  ) {
    this.logger.debug({ friendExternalId, relationshipExternalId }, 'Deleting relationship');

    // Delete the primary relationship and its inverse together so an inverse
    // edge can't survive its partner.
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const [deleted] = await deleteRelationship.run(
        { userExternalId, friendExternalId, relationshipExternalId },
        client,
      );

      if (deleted === undefined) {
        throw new ResourceNotFoundError('Relationship', relationshipExternalId);
      }

      await deleteInverseRelationship.run(
        {
          userExternalId,
          friendExternalId,
          relatedFriendId: deleted.related_friend_id,
          relationshipTypeId: deleted.relationship_type_id,
        },
        client,
      );

      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback failure to preserve the original error.
      }
      throw error;
    } finally {
      client.release();
    }

    this.logger.info({ friendExternalId, relationshipExternalId }, 'Relationship deleted');
  }

  public async searchFriends(
    userExternalId: string,
    query: string,
    excludeFriendExternalId?: string,
    limit = 10,
  ) {
    this.logger.debug({ query, excludeFriendExternalId }, 'Searching friends');

    const searchPattern = createWildcardQuery(query);

    const results = await searchFriends.run(
      {
        userExternalId,
        searchPattern,
        excludeFriendExternalId: excludeFriendExternalId ?? null,
        limit,
      },
      this.db,
    );

    return results.map(
      (r) =>
        ({
          id: r.external_id,
          displayName: r.display_name,
          photoThumbnailUrl: r.photo_thumbnail_url ?? undefined,
        }) satisfies FriendSearchResultResponse,
    );
  }

  public mapRelationship(row: IGetRelationshipsByFriendIdResult) {
    return {
      id: row.external_id,
      relatedFriendId: row.related_friend_external_id,
      relatedFriendDisplayName: row.related_friend_display_name,
      relatedFriendPhotoThumbnailUrl: row.related_friend_photo_thumbnail_url ?? undefined,
      relationshipTypeId: parseRelationshipTypeId(row.relationship_type_id),
      relationshipTypeLabel: row.relationship_type_label,
      relationshipCategory: parseRelationshipCategory(row.relationship_category),
      notes: row.notes ?? undefined,
      createdAt: row.created_at.toISOString(),
    } satisfies RelationshipResponse;
  }
}
