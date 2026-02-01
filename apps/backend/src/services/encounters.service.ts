import type {
  Encounter,
  EncounterFriendSummary,
  EncounterInput,
  EncounterListItem,
  EncounterListOptions,
  EncounterListResponse,
  EncounterUpdate,
  LastEncounterSummary,
} from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import {
  clearEncounterFriends,
  type ISetEncounterFriendsResult,
  setEncounterFriends,
} from '../models/queries/encounter-friends.queries.js';
import {
  countEncountersByUserId,
  createEncounter,
  deleteEncounter,
  getEncounterById,
  getEncounterFriends,
  getEncounterFriendsPreview,
  getEncountersByUserId,
  getLastEncounterForFriend,
  type IGetEncounterByIdResult,
  type IGetEncounterFriendsResult,
  type IGetEncountersByUserIdResult,
  updateEncounter,
} from '../models/queries/encounters.queries.js';
import { EncounterCreationError } from '../utils/errors.js';

const PREVIEW_FRIEND_LIMIT = 3;

/**
 * Service for managing encounters (meeting tracking feature)
 */
export class EncountersService {
  constructor(private db: Pool) {}

  // ============================================================================
  // Encounter CRUD
  // ============================================================================

  /**
   * List all encounters for a user with pagination and filtering
   */
  async listEncounters(
    userExternalId: string,
    options: EncounterListOptions,
  ): Promise<EncounterListResponse> {
    const offset = (options.page - 1) * options.pageSize;

    // Get encounters and count in parallel
    const [encountersResult, countResult] = await Promise.all([
      getEncountersByUserId.run(
        {
          userExternalId,
          friendExternalId: options.friendId ?? null,
          fromDate: options.fromDate ?? null,
          toDate: options.toDate ?? null,
          search: options.search ?? null,
          pageSize: options.pageSize,
          offset,
        },
        this.db,
      ),
      countEncountersByUserId.run(
        {
          userExternalId,
          friendExternalId: options.friendId ?? null,
          fromDate: options.fromDate ?? null,
          toDate: options.toDate ?? null,
          search: options.search ?? null,
        },
        this.db,
      ),
    ]);

    const totalCount = countResult[0]?.total_count ?? 0;

    // Get friend previews for each encounter
    const encounters: EncounterListItem[] = await Promise.all(
      encountersResult.map(async (row) => {
        const friends = await getEncounterFriendsPreview.run(
          { encounterExternalId: row.external_id, limit: PREVIEW_FRIEND_LIMIT },
          this.db,
        );
        return this.mapEncounterListItem(row, friends);
      }),
    );

    return {
      encounters,
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / options.pageSize),
      },
    };
  }

  /**
   * Get a single encounter by ID with all friends
   */
  async getEncounterById(
    userExternalId: string,
    encounterExternalId: string,
  ): Promise<Encounter | null> {
    const results = await getEncounterById.run({ userExternalId, encounterExternalId }, this.db);
    if (results.length === 0) {
      return null;
    }

    const friends = await getEncounterFriends.run({ userExternalId, encounterExternalId }, this.db);
    return this.mapEncounter(results[0], friends);
  }

  /**
   * Create a new encounter with friend assignments
   */
  async createEncounter(userExternalId: string, input: EncounterInput): Promise<Encounter> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Create the encounter
      const encounterResults = await createEncounter.run(
        {
          userExternalId,
          title: input.title,
          encounterDate: input.encounter_date,
          locationText: input.location_text ?? null,
          description: input.description ?? null,
        },
        client,
      );

      if (encounterResults.length === 0) {
        throw new EncounterCreationError();
      }

      const encounter = encounterResults[0];

      // Add friends to the encounter
      let friends: EncounterFriendSummary[] = [];
      if (input.friend_ids.length > 0) {
        const friendResults = await setEncounterFriends.run(
          {
            encounterExternalId: encounter.external_id,
            userExternalId,
            friendExternalIds: input.friend_ids,
          },
          client,
        );
        friends = this.mapFriendResults(friendResults);
      }

      await client.query('COMMIT');

      return this.mapEncounter(encounter, friends);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing encounter
   */
  async updateEncounter(
    userExternalId: string,
    encounterExternalId: string,
    input: EncounterUpdate,
  ): Promise<Encounter | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Update the encounter
      const encounterResults = await updateEncounter.run(
        {
          userExternalId,
          encounterExternalId,
          title: input.title ?? null,
          encounterDate: input.encounter_date ?? null,
          updateLocationText: 'location_text' in input,
          locationText: input.location_text ?? null,
          updateDescription: 'description' in input,
          description: input.description ?? null,
        },
        client,
      );

      if (encounterResults.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const encounter = encounterResults[0];

      // Update friends if provided
      let friends: EncounterFriendSummary[];
      if (input.friend_ids !== undefined) {
        // Clear existing friends and set new ones
        await clearEncounterFriends.run({ encounterExternalId, userExternalId }, client);

        if (input.friend_ids.length > 0) {
          const friendResults = await setEncounterFriends.run(
            {
              encounterExternalId,
              userExternalId,
              friendExternalIds: input.friend_ids,
            },
            client,
          );
          friends = this.mapFriendResults(friendResults);
        } else {
          friends = [];
        }
      } else {
        // Fetch existing friends
        const friendResults = await getEncounterFriends.run(
          { encounterExternalId, userExternalId },
          client,
        );
        friends = friendResults.map((f) => this.mapFriendSummary(f));
      }

      await client.query('COMMIT');

      return this.mapEncounter(encounter, friends);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete an encounter
   */
  async deleteEncounter(userExternalId: string, encounterExternalId: string): Promise<boolean> {
    const results = await deleteEncounter.run({ userExternalId, encounterExternalId }, this.db);
    return results.length > 0;
  }

  /**
   * Get the most recent encounter with a specific friend
   */
  async getLastEncounterForFriend(
    userExternalId: string,
    friendExternalId: string,
  ): Promise<LastEncounterSummary | null> {
    const results = await getLastEncounterForFriend.run(
      { userExternalId, friendExternalId },
      this.db,
    );
    if (results.length === 0) {
      return null;
    }
    const row = results[0];
    return {
      id: row.external_id,
      title: row.title,
      encounterDate: this.formatDate(row.encounter_date),
    };
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapEncounter(
    row: IGetEncounterByIdResult,
    friends: IGetEncounterFriendsResult[] | EncounterFriendSummary[],
  ): Encounter {
    return {
      id: row.external_id,
      title: row.title,
      encounterDate: this.formatDate(row.encounter_date),
      locationText: row.location_text,
      description: row.description,
      friends: friends.map((f) => ('id' in f ? f : this.mapFriendSummary(f))),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapEncounterListItem(
    row: IGetEncountersByUserIdResult,
    friends: IGetEncounterFriendsResult[],
  ): EncounterListItem {
    return {
      id: row.external_id,
      title: row.title,
      encounterDate: this.formatDate(row.encounter_date),
      locationText: row.location_text,
      friendCount: row.friend_count ?? 0,
      friends: friends.map((f) => this.mapFriendSummary(f)),
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapFriendSummary(row: IGetEncounterFriendsResult): EncounterFriendSummary {
    return {
      id: row.external_id,
      displayName: row.display_name ?? 'Unknown',
      photoUrl: row.photo_url,
    };
  }

  private mapFriendResults(results: ISetEncounterFriendsResult[]): EncounterFriendSummary[] {
    return results
      .filter((r) => r.friend_external_id !== null && r.friend_display_name !== null)
      .map((r) => ({
        id: r.friend_external_id as string,
        displayName: r.friend_display_name as string,
        photoUrl: r.friend_photo_url,
      }));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
