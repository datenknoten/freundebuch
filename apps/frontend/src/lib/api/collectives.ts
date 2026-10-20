import {
  CollectiveCircleResponseSchema,
  type CollectiveCreateInputSchema,
  CollectiveListResponseSchema,
  CollectiveResponseSchema,
  CollectiveTypeListResponseSchema,
  type CollectiveUpdateInputSchema,
  MessageResponseSchema,
  SuccessResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';
import { withQuery } from './with-query.js';

export interface CollectivesApiOptions {
  client: ApiClient;
}

export interface CollectiveListParams {
  page?: number;
  pageSize?: number;
  typeId?: string;
  search?: string;
  shouldIncludeDeleted?: boolean;
}

export interface CollectiveCreateData {
  name: string;
  collectiveTypeId: string;
  notes?: string | null;
}

export interface CollectiveUpdateData {
  name?: string;
  notes?: string | null;
}

const CollectiveCircleResponseListSchema = CollectiveCircleResponseSchema.array();

function mapCollectiveCreateInput(data: CollectiveCreateData) {
  return {
    name: data.name,
    collective_type_id: data.collectiveTypeId,
    notes: data.notes,
  } satisfies typeof CollectiveCreateInputSchema.inferIn;
}

function mapCollectiveUpdateInput(data: CollectiveUpdateData) {
  return {
    name: data.name,
    notes: data.notes,
  } satisfies typeof CollectiveUpdateInputSchema.inferIn;
}

export class CollectivesApi {
  private readonly client: ApiClient;

  public constructor(options: CollectivesApiOptions) {
    this.client = options.client;
  }

  public listCollectiveTypes() {
    return this.client.request(CollectiveTypeListResponseSchema, '/api/collectives/types');
  }

  public listCollectives(params: CollectiveListParams = {}) {
    return this.client.request(
      CollectiveListResponseSchema,
      withQuery('/api/collectives', {
        page: params.page,
        page_size: params.pageSize,
        type_id: params.typeId === '' ? undefined : params.typeId,
        search: params.search === '' ? undefined : params.search,
        include_deleted: params.shouldIncludeDeleted === true ? 'true' : undefined,
      }),
    );
  }

  public getCollective(collectiveId: string) {
    return this.client.request(CollectiveResponseSchema, `/api/collectives/${collectiveId}`);
  }

  public createCollective(data: CollectiveCreateData) {
    return this.client.request(CollectiveResponseSchema, '/api/collectives', {
      method: 'POST',
      body: JSON.stringify(mapCollectiveCreateInput(data)),
    });
  }

  public updateCollective(collectiveId: string, data: CollectiveUpdateData) {
    return this.client.request(CollectiveResponseSchema, `/api/collectives/${collectiveId}`, {
      method: 'PUT',
      body: JSON.stringify(mapCollectiveUpdateInput(data)),
    });
  }

  /** Soft-deletes the collective. */
  public async deleteCollective(collectiveId: string) {
    await this.client.request(SuccessResponseSchema, `/api/collectives/${collectiveId}`, {
      method: 'DELETE',
    });
  }

  public listCollectiveCircles(collectiveId: string) {
    return this.client.request(
      CollectiveCircleResponseListSchema,
      `/api/collectives/${collectiveId}/circles`,
    );
  }

  public async addCollectiveToCircle(collectiveId: string, circleId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/collectives/${collectiveId}/circles/${circleId}`,
      { method: 'POST' },
    );
  }

  public async removeCollectiveFromCircle(collectiveId: string, circleId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/collectives/${collectiveId}/circles/${circleId}`,
      { method: 'DELETE' },
    );
  }
}
