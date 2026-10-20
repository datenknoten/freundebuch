import type { Logger } from 'pino';
import { derived, get, type Readable, writable } from 'svelte/store';
import type { CircleResponse } from '$shared';
import type { CircleData, CircleOrderItem, CirclesApi } from '../api/circles.js';
import { storeAction } from './store-action.js';

export interface CirclesStoreOptions {
  circlesApi: CirclesApi;
  logger: Logger;
}

export interface CirclesState {
  circles: CircleResponse[];
  isLoading: boolean;
  error: string | null;
  /** Whether circles have been successfully loaded at least once. */
  hasLoaded: boolean;
}

const INITIAL_STATE: CirclesState = {
  circles: [],
  isLoading: false,
  error: null,
  hasLoaded: false,
};

function bySortOrder(a: CircleResponse, b: CircleResponse) {
  return a.sortOrder - b.sortOrder;
}

function replaceCircle(state: CirclesState, updated: CircleResponse) {
  return { circles: state.circles.map((circle) => (circle.id === updated.id ? updated : circle)) };
}

function applySortOrder(state: CirclesState, order: CircleOrderItem[]) {
  const sortOrderById = new Map(order.map((item) => [item.id, item.sortOrder]));
  const circles = state.circles.map((circle) => ({
    ...circle,
    sortOrder: sortOrderById.get(circle.id) ?? circle.sortOrder,
  }));
  return { circles: circles.sort(bySortOrder) };
}

function withoutCircle(state: CirclesState, circleId: string) {
  return { circles: state.circles.filter((circle) => circle.id !== circleId) };
}

function mergeInto(state: CirclesState, sourceCircleId: string, merged: CircleResponse) {
  const { circles } = withoutCircle(state, sourceCircleId);
  return { circles: circles.map((circle) => (circle.id === merged.id ? merged : circle)) };
}

function indexCircles(state: CirclesState) {
  return new Map(state.circles.map((circle) => [circle.id, circle]));
}

/**
 * The circles of the signed-in user. A failed action stores its message in `error` and rethrows;
 * `clear` drops the cache, for example after a sign-out.
 */
export class CirclesStore {
  public readonly subscribe: Readable<CirclesState>['subscribe'];
  /** The circles ordered by `sortOrder`. */
  public readonly list: Readable<CircleResponse[]>;
  public readonly byId: Readable<Map<string, CircleResponse>>;
  private readonly state = writable(INITIAL_STATE);
  private readonly circlesApi: CirclesApi;
  private readonly logger: Logger;
  // Shared by concurrent callers so they all await the same result instead of stale or empty data.
  private inFlight: Promise<CircleResponse[]> | undefined;

  public constructor(options: CirclesStoreOptions) {
    this.circlesApi = options.circlesApi;
    this.logger = options.logger;
    this.subscribe = this.state.subscribe;
    this.list = derived(this.state, (state) => [...state.circles].sort(bySortOrder));
    this.byId = derived(this.state, indexCircles);
  }

  /**
   * Serves the cached circles after the first successful load, and joins a load in flight, so
   * every consumer shares one request. `shouldRefetch` bypasses both.
   */
  public async loadCircles(shouldRefetch = false) {
    const state = get(this.state);
    if (shouldRefetch === false && state.hasLoaded === true) {
      return state.circles;
    }
    if (shouldRefetch === false && this.inFlight !== undefined) {
      return this.inFlight;
    }
    const load = this.fetchCircles();
    this.inFlight = load;
    return load;
  }

  /** Loads in the background: a failure is logged and kept in `error`, never thrown. */
  public async preloadCircles() {
    try {
      await this.loadCircles();
    } catch (err) {
      this.logger.warn({ err }, 'Failed to preload circles');
    }
  }

  public createCircle(data: CircleData) {
    return storeAction(
      this.state.update,
      () => this.circlesApi.createCircle(data),
      (state, circle) => ({ circles: [...state.circles, circle] }),
      'Failed to create circle',
    );
  }

  public updateCircle(circleId: string, data: CircleData) {
    return storeAction(
      this.state.update,
      () => this.circlesApi.updateCircle(circleId, data),
      replaceCircle,
      'Failed to update circle',
    );
  }

  public deleteCircle(circleId: string) {
    return storeAction(
      this.state.update,
      () => this.circlesApi.deleteCircle(circleId),
      (state) => withoutCircle(state, circleId),
      'Failed to delete circle',
    );
  }

  public reorderCircles(order: CircleOrderItem[]) {
    return storeAction(
      this.state.update,
      () => this.circlesApi.reorderCircles(order),
      (state) => applySortOrder(state, order),
      'Failed to reorder circles',
    );
  }

  public mergeCircles(targetCircleId: string, sourceCircleId: string) {
    return storeAction(
      this.state.update,
      () => this.circlesApi.mergeCircles(targetCircleId, sourceCircleId),
      (state, merged) => mergeInto(state, sourceCircleId, merged),
      'Failed to merge circles',
    );
  }

  public clear() {
    this.inFlight = undefined;
    this.state.set(INITIAL_STATE);
  }

  private async fetchCircles() {
    try {
      return await storeAction(
        this.state.update,
        () => this.circlesApi.listCircles(),
        (_state, circles) => ({ circles, hasLoaded: true }),
        'Failed to load circles',
      );
    } finally {
      this.inFlight = undefined;
    }
  }
}
