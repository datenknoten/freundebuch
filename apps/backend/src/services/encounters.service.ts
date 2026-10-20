import type {
  EncounterCreateInput,
  EncounterFriendSummaryResponse,
  EncounterListItemResponse,
  EncounterListOptions,
  EncounterListResponse,
  EncounterResponse,
  EncounterType,
  EncounterUpdateInput,
  LastEncounterSummaryResponse,
} from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import { EncounterCreationError } from '../errors/encounter-creation.error.js';
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
  getEncounterFriendsPreviewBatch,
  getEncountersByUserId,
  getLastEncounterForFriend,
  type IGetEncounterByIdResult,
  type IGetEncounterFriendsResult,
  type IGetEncountersByUserIdResult,
  updateEncounter,
} from '../models/queries/encounters.queries.js';
import { formatDateOnly } from '../utils/date.js';

const PREVIEW_FRIEND_LIMIT = 3;

export interface EncountersServiceOptions {
  db: Pool;
}

/**
 * Service for managing encounters (meeting tracking feature)
 */
export class EncountersService {
  private db: Pool;

  constructor(options: EncountersServiceOptions) {
    this.db = options.db;
  }

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
          encounterType: options.type ?? null,
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
          encounterType: options.type ?? null,
          search: options.search ?? null,
        },
        this.db,
      ),
    ]);

    const totalCount = countResult[0]?.total_count ?? 0;

    // Fetch the friend previews for the whole page in one query (avoids N+1),
    // then group them by encounter in memory.
    const previewRows = await getEncounterFriendsPreviewBatch.run(
      {
        userExternalId,
        encounterExternalIds: encountersResult.map((row) => row.external_id),
        limit: PREVIEW_FRIEND_LIMIT,
      },
      this.db,
    );

    const previewsByEncounter = new Map<string, typeof previewRows>();
    for (const preview of previewRows) {
      const list = previewsByEncounter.get(preview.encounter_external_id);
      if (list) {
        list.push(preview);
      } else {
        previewsByEncounter.set(preview.encounter_external_id, [preview]);
      }
    }

    const data: EncounterListItemResponse[] = encountersResult.map((row) =>
      this.mapEncounterListItem(row, previewsByEncounter.get(row.external_id) ?? []),
    );

    return {
      data,
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
  ): Promise<EncounterResponse | null> {
    const results = await getEncounterById.run({ userExternalId, encounterExternalId }, this.db);
    const [row] = results;
    if (row === undefined) {
      return null;
    }

    const friends = await getEncounterFriends.run({ userExternalId, encounterExternalId }, this.db);
    return this.mapEncounter(row, friends);
  }

  /**
   * Create a new encounter with friend assignments
   */
  async createEncounter(
    userExternalId: string,
    input: EncounterCreateInput,
  ): Promise<EncounterResponse> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Create the encounter
      const encounterResults = await createEncounter.run(
        {
          userExternalId,
          title: input.title ?? null,
          encounterType: input.encounter_type,
          encounterDate: input.encounter_date,
          locationText: input.location_text ?? null,
          description: input.description ?? null,
        },
        client,
      );

      const [encounter] = encounterResults;
      if (encounter === undefined) {
        throw new EncounterCreationError();
      }

      // Add friends to the encounter
      let friends: EncounterFriendSummaryResponse[] = [];
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
    input: EncounterUpdateInput,
  ): Promise<EncounterResponse | null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Update the encounter
      const encounterResults = await updateEncounter.run(
        {
          userExternalId,
          encounterExternalId,
          updateTitle: 'title' in input,
          title: input.title ?? null,
          encounterType: input.encounter_type ?? null,
          encounterDate: input.encounter_date ?? null,
          updateLocationText: 'location_text' in input,
          locationText: input.location_text ?? null,
          updateDescription: 'description' in input,
          description: input.description ?? null,
        },
        client,
      );

      const [encounter] = encounterResults;
      if (encounter === undefined) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update friends if provided
      let friends: EncounterFriendSummaryResponse[];
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
  ): Promise<LastEncounterSummaryResponse | null> {
    const results = await getLastEncounterForFriend.run(
      { userExternalId, friendExternalId },
      this.db,
    );
    const [row] = results;
    if (row === undefined) {
      return null;
    }
    return {
      id: row.external_id,
      title: row.title,
      encounterType: row.encounter_type as EncounterType,
      encounterDate: formatDateOnly(row.encounter_date),
    };
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapEncounter(
    row: IGetEncounterByIdResult,
    friends: IGetEncounterFriendsResult[] | EncounterFriendSummaryResponse[],
  ): EncounterResponse {
    return {
      id: row.external_id,
      title: row.title,
      encounterType: row.encounter_type as EncounterType,
      encounterDate: formatDateOnly(row.encounter_date),
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
  ): EncounterListItemResponse {
    return {
      id: row.external_id,
      title: row.title,
      encounterType: row.encounter_type as EncounterType,
      encounterDate: formatDateOnly(row.encounter_date),
      locationText: row.location_text,
      friendCount: row.friend_count ?? 0,
      friends: friends.map((f) => this.mapFriendSummary(f)),
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapFriendSummary(row: IGetEncounterFriendsResult): EncounterFriendSummaryResponse {
    return {
      id: row.external_id,
      displayName: row.display_name ?? 'Unknown',
      photoUrl: row.photo_url,
    };
  }

  private mapFriendResults(
    results: ISetEncounterFriendsResult[],
  ): EncounterFriendSummaryResponse[] {
    return results.flatMap((r) =>
      r.friend_external_id !== null && r.friend_display_name !== null
        ? [
            {
              id: r.friend_external_id,
              displayName: r.friend_display_name,
              photoUrl: r.friend_photo_url,
            },
          ]
        : [],
    );
  }
}
