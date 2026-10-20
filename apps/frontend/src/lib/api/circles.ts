import {
  type CircleInputSchema,
  type CircleMergeInputSchema,
  type CircleReorderInputSchema,
  CircleResponseSchema,
  CircleSummaryResponseSchema,
  MessageResponseSchema,
  type SetFriendCirclesInputSchema,
  SuccessResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';

export interface CirclesApiOptions {
  client: ApiClient;
}

export interface CircleData {
  name: string;
  color?: string | null;
  parentCircleId?: string | null;
}

export interface CircleOrderItem {
  id: string;
  sortOrder: number;
}

const CircleResponseListSchema = CircleResponseSchema.array();
const CircleSummaryResponseListSchema = CircleSummaryResponseSchema.array();

function mapCircleInput(data: CircleData) {
  return {
    name: data.name,
    color: data.color,
    parent_circle_id: data.parentCircleId,
  } satisfies typeof CircleInputSchema.inferIn;
}

function mapCircleReorderInput(order: CircleOrderItem[]) {
  return {
    order: order.map((item) => ({ id: item.id, sort_order: item.sortOrder })),
  } satisfies typeof CircleReorderInputSchema.inferIn;
}

export class CirclesApi {
  private readonly client: ApiClient;

  public constructor(options: CirclesApiOptions) {
    this.client = options.client;
  }

  public listCircles() {
    return this.client.request(CircleResponseListSchema, '/api/circles');
  }

  public getCircle(circleId: string) {
    return this.client.request(CircleResponseSchema, `/api/circles/${circleId}`);
  }

  public createCircle(data: CircleData) {
    return this.client.request(CircleResponseSchema, '/api/circles', {
      method: 'POST',
      body: JSON.stringify(mapCircleInput(data)),
    });
  }

  public updateCircle(circleId: string, data: CircleData) {
    return this.client.request(CircleResponseSchema, `/api/circles/${circleId}`, {
      method: 'PUT',
      body: JSON.stringify(mapCircleInput(data)),
    });
  }

  public async deleteCircle(circleId: string) {
    await this.client.request(SuccessResponseSchema, `/api/circles/${circleId}`, {
      method: 'DELETE',
    });
  }

  public async reorderCircles(order: CircleOrderItem[]) {
    await this.client.request(SuccessResponseSchema, '/api/circles/reorder', {
      method: 'PUT',
      body: JSON.stringify(mapCircleReorderInput(order)),
    });
  }

  /** Moves the friends of the source circle into the target, then deletes the source. */
  public mergeCircles(targetCircleId: string, sourceCircleId: string) {
    const input = {
      source_circle_id: sourceCircleId,
    } satisfies typeof CircleMergeInputSchema.inferIn;
    return this.client.request(CircleResponseSchema, `/api/circles/${targetCircleId}/merge`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public getFriendCircles(friendId: string) {
    return this.client.request(CircleSummaryResponseListSchema, `/api/friends/${friendId}/circles`);
  }

  /** Replaces every circle assignment of the friend. */
  public setFriendCircles(friendId: string, circleIds: string[]) {
    const input = { circle_ids: circleIds } satisfies typeof SetFriendCirclesInputSchema.inferIn;
    return this.client.request(
      CircleSummaryResponseListSchema,
      `/api/friends/${friendId}/circles`,
      { method: 'PUT', body: JSON.stringify(input) },
    );
  }

  public addFriendToCircle(friendId: string, circleId: string) {
    return this.client.request(
      CircleSummaryResponseSchema,
      `/api/friends/${friendId}/circles/${circleId}`,
      { method: 'POST' },
    );
  }

  public async removeFriendFromCircle(friendId: string, circleId: string) {
    await this.client.request(
      MessageResponseSchema,
      `/api/friends/${friendId}/circles/${circleId}`,
      { method: 'DELETE' },
    );
  }
}
