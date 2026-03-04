import { derived, writable } from 'svelte/store';
import type { Circle, CircleInput, CircleSummary, CircleWithHierarchy } from '$shared';
import { buildCircleHierarchy } from '$shared';
import * as circlesApi from '../api/circles.js';
import { storeAction } from './storeAction.js';

interface CirclesState {
  circles: Circle[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CirclesState = {
  circles: [],
  isLoading: false,
  error: null,
};

function createCirclesStore() {
  const { subscribe, set, update } = writable<CirclesState>(initialState);

  return {
    subscribe,

    loadCircles: () =>
      storeAction(
        update,
        () => circlesApi.listCircles(),
        (_state, circles) => ({ circles }),
        'Failed to load circles',
      ),

    createCircle: (input: CircleInput) =>
      storeAction(
        update,
        () => circlesApi.createCircle(input),
        (state, circle) => ({ circles: [...state.circles, circle] }),
        'Failed to create circle',
      ),

    updateCircle: (circleId: string, input: Partial<CircleInput>) =>
      storeAction(
        update,
        () => circlesApi.updateCircle(circleId, input),
        (state, updatedCircle) => ({
          circles: state.circles.map((c) => (c.id === circleId ? updatedCircle : c)),
        }),
        'Failed to update circle',
      ),

    deleteCircle: (circleId: string) =>
      storeAction(
        update,
        () => circlesApi.deleteCircle(circleId),
        (state) => ({
          circles: state.circles.filter((c) => c.id !== circleId),
        }),
        'Failed to delete circle',
      ),

    reorderCircles: (order: Array<{ id: string; sort_order: number }>) =>
      storeAction(
        update,
        () => circlesApi.reorderCircles(order),
        (state) => {
          const orderMap = new Map(order.map((o) => [o.id, o.sort_order]));
          const updatedCircles = state.circles.map((c) => ({
            ...c,
            sortOrder: orderMap.get(c.id) ?? c.sortOrder,
          }));

          return {
            circles: updatedCircles.sort((a, b) => a.sortOrder - b.sortOrder),
          };
        },
        'Failed to reorder circles',
      ),

    mergeCircles: (targetCircleId: string, sourceCircleId: string) =>
      storeAction(
        update,
        () => circlesApi.mergeCircles(targetCircleId, sourceCircleId),
        (state, mergedCircle) => ({
          circles: state.circles
            .filter((c) => c.id !== sourceCircleId)
            .map((c) => (c.id === targetCircleId ? mergedCircle : c)),
        }),
        'Failed to merge circles',
      ),

    clear: () => {
      set(initialState);
    },
  };
}

export const circles = createCirclesStore();

export const circlesList = derived(circles, ($circles) =>
  [...$circles.circles].sort((a, b) => a.sortOrder - b.sortOrder),
);

export const circleHierarchy = derived(circles, ($circles): CircleWithHierarchy[] =>
  buildCircleHierarchy($circles.circles),
);

export const circlesById = derived(
  circles,
  ($circles) => new Map<string, Circle>($circles.circles.map((c) => [c.id, c])),
);

export function getCirclePath(circleId: string, circlesMap: Map<string, Circle>): string {
  const parts: string[] = [];
  let currentId: string | null = circleId;

  while (currentId) {
    const circle = circlesMap.get(currentId);
    if (!circle) break;
    parts.unshift(circle.name);
    currentId = circle.parentCircleId;
  }

  return parts.join(' → ');
}

// ============================================================================
// Friend-Circle Assignment Helpers
// ============================================================================

export async function setFriendCircles(
  friendId: string,
  circleIds: string[],
): Promise<CircleSummary[]> {
  return circlesApi.setFriendCircles(friendId, circleIds);
}

export async function addFriendToCircle(
  friendId: string,
  circleId: string,
): Promise<CircleSummary> {
  return circlesApi.addFriendToCircle(friendId, circleId);
}

export async function removeFriendFromCircle(friendId: string, circleId: string): Promise<void> {
  return circlesApi.removeFriendFromCircle(friendId, circleId);
}

// ============================================================================
// Favorites & Archive Helpers
// ============================================================================

export async function toggleFavorite(friendId: string): Promise<boolean> {
  return circlesApi.toggleFavorite(friendId);
}

export async function archiveFriend(friendId: string, reason?: string): Promise<void> {
  return circlesApi.archiveFriend(friendId, reason);
}

export async function unarchiveFriend(friendId: string): Promise<void> {
  return circlesApi.unarchiveFriend(friendId);
}
