import type {
  FriendSearchResult,
  Relationship,
  RelationshipCategory,
  RelationshipInput,
  RelationshipType,
  RelationshipTypeId,
  RelationshipTypesGrouped,
  RelationshipUpdateInput,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
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
import { createWildcardQuery } from './search.service.js';

export interface RelationshipServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * RelationshipService handles all relationship functionality between friends.
 * Extracted from FriendsService for better separation of concerns.
 */
export class RelationshipService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(options: RelationshipServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Get all relationship types grouped by category
   */
  async getRelationshipTypes(): Promise<RelationshipTypesGrouped> {
    this.logger.debug('Getting relationship types');

    const types = await getAllRelationshipTypes.run(undefined, this.db);

    const grouped: RelationshipTypesGrouped = {
      family: [],
      professional: [],
      social: [],
    };

    for (const t of types) {
      const relationshipType: RelationshipType = {
        id: t.id as RelationshipTypeId,
        category: t.category as RelationshipCategory,
        label: t.label,
        inverseTypeId: (t.inverse_type_id ?? t.id) as RelationshipTypeId,
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

  /**
   * Add a relationship between two friends (creates inverse automatically)
   */
  async addRelationship(
    userExternalId: string,
    friendExternalId: string,
    data: RelationshipInput,
  ): Promise<Relationship | null> {
    this.logger.debug(
      { friendExternalId, relatedFriendExternalId: data.related_friend_id },
      'Adding relationship',
    );

    // Create the primary relationship
    const [relationship] = await createRelationship.run(
      {
        userExternalId,
        friendExternalId,
        relatedFriendExternalId: data.related_friend_id,
        relationshipTypeId: data.relationship_type_id,
        notes: data.notes ?? null,
      },
      this.db,
    );

    if (!relationship) {
      return null;
    }

    // Create the inverse relationship (if inverse type exists)
    await createInverseRelationship.run(
      {
        userExternalId,
        friendExternalId,
        relatedFriendExternalId: data.related_friend_id,
        relationshipTypeId: data.relationship_type_id,
        notes: data.notes ?? null,
      },
      this.db,
    );

    // Fetch the full relationship with related friend info
    const [fullRelationship] = await getRelationshipById.run(
      {
        userExternalId,
        friendExternalId,
        relationshipExternalId: relationship.external_id,
      },
      this.db,
    );

    if (!fullRelationship) {
      return null;
    }

    this.logger.info(
      {
        friendExternalId,
        relatedFriendExternalId: data.related_friend_id,
        relationshipType: data.relationship_type_id,
      },
      'Relationship created successfully',
    );

    return this.mapRelationship(fullRelationship);
  }

  /**
   * Update a relationship's notes
   */
  async updateRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
    data: RelationshipUpdateInput,
  ): Promise<Relationship | null> {
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

    if (!updated) {
      return null;
    }

    // Fetch the full relationship with related friend info
    const [fullRelationship] = await getRelationshipById.run(
      {
        userExternalId,
        friendExternalId,
        relationshipExternalId,
      },
      this.db,
    );

    if (!fullRelationship) {
      return null;
    }

    this.logger.info({ friendExternalId, relationshipExternalId }, 'Relationship updated');

    return this.mapRelationship(fullRelationship);
  }

  /**
   * Delete a relationship (and its inverse)
   */
  async deleteRelationship(
    userExternalId: string,
    friendExternalId: string,
    relationshipExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, relationshipExternalId }, 'Deleting relationship');

    // Delete the primary relationship and get related friend ID
    const [deleted] = await deleteRelationship.run(
      { userExternalId, friendExternalId, relationshipExternalId },
      this.db,
    );

    if (!deleted) {
      return false;
    }

    // Delete the inverse relationship
    await deleteInverseRelationship.run(
      {
        userExternalId,
        friendExternalId,
        relatedFriendId: deleted.related_friend_id,
        relationshipTypeId: deleted.relationship_type_id,
      },
      this.db,
    );

    this.logger.info({ friendExternalId, relationshipExternalId }, 'Relationship deleted');

    return true;
  }

  /**
   * Search friends by name (for autocomplete)
   */
  async searchFriends(
    userExternalId: string,
    query: string,
    excludeFriendExternalId?: string,
    limit = 10,
  ): Promise<FriendSearchResult[]> {
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

    return results.map((r) => ({
      id: r.external_id,
      displayName: r.display_name,
      photoThumbnailUrl: r.photo_thumbnail_url ?? undefined,
    }));
  }

  /**
   * Map a relationship row to the Relationship type
   */
  mapRelationship(row: IGetRelationshipsByFriendIdResult): Relationship {
    return {
      id: row.external_id,
      relatedFriendId: row.related_friend_external_id,
      relatedFriendDisplayName: row.related_friend_display_name,
      relatedFriendPhotoThumbnailUrl: row.related_friend_photo_thumbnail_url ?? undefined,
      relationshipTypeId: row.relationship_type_id as RelationshipTypeId,
      relationshipTypeLabel: row.relationship_type_label,
      relationshipCategory: row.relationship_category as RelationshipCategory,
      notes: row.notes ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }
}
