import {
  type EncounterCreateInputSchema,
  EncounterListResponseSchema,
  EncounterResponseSchema,
  type EncounterType,
  type EncounterUpdateInputSchema,
  LastEncounterSummaryResponseSchema,
  SuccessResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';
import { ApiError } from './api-error.js';
import { withQuery } from './with-query.js';

export interface EncountersApiOptions {
  client: ApiClient;
}

export interface EncounterListParams {
  page?: number;
  pageSize?: number;
  friendId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  type?: EncounterType;
}

export interface EncounterCreateData {
  title?: string;
  encounterDate: string;
  encounterType?: EncounterType;
  friendIds: string[];
  locationText?: string | null;
  description?: string | null;
}

export interface EncounterUpdateData {
  title?: string | null;
  encounterDate?: string;
  encounterType?: EncounterType;
  friendIds?: string[];
  locationText?: string | null;
  description?: string | null;
}

const NOT_FOUND_STATUS = 404;

/** An empty filter means "no filter", so it stays out of the query string. */
function nonEmpty(value: string | undefined) {
  return value === '' ? undefined : value;
}

function mapEncounterCreateInput(data: EncounterCreateData) {
  return {
    title: data.title,
    encounter_date: data.encounterDate,
    encounter_type: data.encounterType,
    friend_ids: data.friendIds,
    location_text: data.locationText,
    description: data.description,
  } satisfies typeof EncounterCreateInputSchema.inferIn;
}

function mapEncounterUpdateInput(data: EncounterUpdateData) {
  return {
    title: data.title,
    encounter_date: data.encounterDate,
    encounter_type: data.encounterType,
    friend_ids: data.friendIds,
    location_text: data.locationText,
    description: data.description,
  } satisfies typeof EncounterUpdateInputSchema.inferIn;
}

export class EncountersApi {
  private readonly client: ApiClient;

  public constructor(options: EncountersApiOptions) {
    this.client = options.client;
  }

  public listEncounters(params: EncounterListParams = {}) {
    return this.client.request(
      EncounterListResponseSchema,
      withQuery('/api/encounters', {
        page: params.page,
        page_size: params.pageSize,
        friend_id: nonEmpty(params.friendId),
        from_date: nonEmpty(params.fromDate),
        to_date: nonEmpty(params.toDate),
        search: nonEmpty(params.search),
        type: params.type,
      }),
    );
  }

  public getEncounter(encounterId: string) {
    return this.client.request(EncounterResponseSchema, `/api/encounters/${encounterId}`);
  }

  public createEncounter(data: EncounterCreateData) {
    return this.client.request(EncounterResponseSchema, '/api/encounters', {
      method: 'POST',
      body: JSON.stringify(mapEncounterCreateInput(data)),
    });
  }

  public updateEncounter(encounterId: string, data: EncounterUpdateData) {
    return this.client.request(EncounterResponseSchema, `/api/encounters/${encounterId}`, {
      method: 'PUT',
      body: JSON.stringify(mapEncounterUpdateInput(data)),
    });
  }

  public async deleteEncounter(encounterId: string) {
    await this.client.request(SuccessResponseSchema, `/api/encounters/${encounterId}`, {
      method: 'DELETE',
    });
  }

  /** The most recent encounter with the friend, or `undefined` when they never met. */
  public async findLastEncounter(friendId: string) {
    try {
      return await this.client.request(
        LastEncounterSummaryResponseSchema,
        `/api/friends/${friendId}/encounters/last`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === NOT_FOUND_STATUS) {
        return undefined;
      }
      throw error;
    }
  }
}
