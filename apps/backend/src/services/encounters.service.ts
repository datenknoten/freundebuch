import type {
  EncounterFriendSummaryResponse,
  EncounterListItemResponse,
  EncounterListOptions,
  EncounterListResponse,
  EncounterResponse,
  EncounterType,
} from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import { EncounterCreationError } from '../errors/encounter-creation.error.js';
import { EncounterNotFoundError } from '../errors/encounter-not-found.error.js';
import { ResourceNotFoundError } from '../errors/resource-not-found.error.js';
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

export interface EncounterCreateData {
  title?: string;
  encounterDate: string;
  encounterType: EncounterType;
  friendIds: string[];
  locationText?: string | null;
  description?: string | null;
}

/** Absent keys leave the field untouched; `null` clears it. */
export interface EncounterUpdateData {
  title?: string | null;
  encounterDate?: string;
  encounterType?: EncounterType;
  /** Replaces the full friend list. */
  friendIds?: string[];
  locationText?: string | null;
  description?: string | null;
}

/**
 * Service for managing encounters (meeting tracking feature)
 */
export class EncountersService {
  private readonly db: Pool;

  constructor(options: EncountersServiceOptions) {
    this.db = options.db;
  }

  // ============================================================================
  // Encounter CRUD
  // ============================================================================

  /**
   * List all encounters for a user with pagination and filtering
   */
  public async listEncounters(
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

  public async findEncounter(userExternalId: string, encounterExternalId: string) {
    const [row] = await getEncounterById.run({ userExternalId, encounterExternalId }, this.db);
    if (row === undefined) {
      return undefined;
    }

    const friends = await getEncounterFriends.run({ userExternalId, encounterExternalId }, this.db);
    return this.mapEncounter(row, friends);
  }

  public async getEncounter(userExternalId: string, encounterExternalId: string) {
    const encounter = await this.findEncounter(userExternalId, encounterExternalId);
    if (encounter === undefined) {
      throw new EncounterNotFoundError(encounterExternalId);
    }
    return encounter;
  }

  /**
   * Create a new encounter with friend assignments
   */
  public async createEncounter(userExternalId: string, data: EncounterCreateData) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const [encounter] = await createEncounter.run(
        {
          userExternalId,
          title: data.title ?? null,
          encounterType: data.encounterType,
          encounterDate: data.encounterDate,
          locationText: data.locationText ?? null,
          description: data.description ?? null,
        },
        client,
      );
      if (encounter === undefined) {
        throw new EncounterCreationError();
      }

      const friendResults: ISetEncounterFriendsResult[] =
        data.friendIds.length === 0
          ? []
          : await setEncounterFriends.run(
              {
                encounterExternalId: encounter.external_id,
                userExternalId,
                friendExternalIds: data.friendIds,
              },
              client,
            );

      await client.query('COMMIT');

      return this.mapEncounter(encounter, this.mapFriendResults(friendResults));
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
  public async updateEncounter(
    userExternalId: string,
    encounterExternalId: string,
    data: EncounterUpdateData,
  ) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const [encounter] = await updateEncounter.run(
        {
          userExternalId,
          encounterExternalId,
          updateTitle: data.title !== undefined,
          title: data.title ?? null,
          encounterType: data.encounterType ?? null,
          encounterDate: data.encounterDate ?? null,
          updateLocationText: data.locationText !== undefined,
          locationText: data.locationText ?? null,
          updateDescription: data.description !== undefined,
          description: data.description ?? null,
        },
        client,
      );
      if (encounter === undefined) {
        throw new EncounterNotFoundError(encounterExternalId);
      }

      if (data.friendIds === undefined) {
        const existingFriends = await getEncounterFriends.run(
          { encounterExternalId, userExternalId },
          client,
        );
        await client.query('COMMIT');
        return this.mapEncounter(encounter, existingFriends);
      }

      await clearEncounterFriends.run({ encounterExternalId, userExternalId }, client);
      const friendResults: ISetEncounterFriendsResult[] =
        data.friendIds.length === 0
          ? []
          : await setEncounterFriends.run(
              {
                encounterExternalId,
                userExternalId,
                friendExternalIds: data.friendIds,
              },
              client,
            );

      await client.query('COMMIT');

      return this.mapEncounter(encounter, this.mapFriendResults(friendResults));
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
  public async deleteEncounter(userExternalId: string, encounterExternalId: string) {
    const results = await deleteEncounter.run({ userExternalId, encounterExternalId }, this.db);
    if (results.length === 0) {
      throw new EncounterNotFoundError(encounterExternalId);
    }
  }

  /**
   * Get the most recent encounter with a specific friend
   */
  public async getLastEncounterForFriend(userExternalId: string, friendExternalId: string) {
    const [row] = await getLastEncounterForFriend.run(
      { userExternalId, friendExternalId },
      this.db,
    );
    if (row === undefined) {
      throw new ResourceNotFoundError('Encounters', friendExternalId);
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
