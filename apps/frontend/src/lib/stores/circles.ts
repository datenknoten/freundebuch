import { derived, writable } from 'svelte/store';
import type { Circle, CircleInput, CircleSummary, CircleWithHierarchy } from '$shared';
import { buildCircleHierarchy } from '$shared';
import { ApiError } from '../api/auth.js';
import * as circlesApi from '../api/circles.js';

/**
 * Circles state interface
 */
interface CirclesState {
  circles: Circle[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial circles state
 */
const initialState: CirclesState = {
  circles: [],
  isLoading: false,
  error: null,
};

/**
 * Create the circles store
 */
function createCirclesStore() {
  const { subscribe, set, update } = writable<CirclesState>(initialState);

  return {
    subscribe,

    /**
     * Load all circles for the current user
     */
    loadCircles: async () => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const circles = await circlesApi.listCircles();

        update((state) => ({
          ...state,
          circles,
          isLoading: false,
          error: null,
        }));

        return circles;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to load circles';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Create a new circle
     */
    createCircle: async (input: CircleInput) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const circle = await circlesApi.createCircle(input);

        update((state) => ({
          ...state,
          circles: [...state.circles, circle],
          isLoading: false,
          error: null,
        }));

        return circle;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to create circle';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Update a circle
     */
    updateCircle: async (circleId: string, input: Partial<CircleInput>) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const updatedCircle = await circlesApi.updateCircle(circleId, input);

        update((state) => ({
          ...state,
          circles: state.circles.map((c) => (c.id === circleId ? updatedCircle : c)),
          isLoading: false,
          error: null,
        }));

        return updatedCircle;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to update circle';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Delete a circle
     */
    deleteCircle: async (circleId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await circlesApi.deleteCircle(circleId);

        update((state) => ({
          ...state,
          circles: state.circles.filter((c) => c.id !== circleId),
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete circle';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Reorder circles
     */
    reorderCircles: async (order: Array<{ id: string; sort_order: number }>) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await circlesApi.reorderCircles(order);

        // Update local state with new sort orders
        update((state) => {
          const orderMap = new Map(order.map((o) => [o.id, o.sort_order]));
          const updatedCircles = state.circles.map((c) => ({
            ...c,
            sortOrder: orderMap.get(c.id) ?? c.sortOrder,
          }));

          return {
            ...state,
            circles: updatedCircles.sort((a, b) => a.sortOrder - b.sortOrder),
            isLoading: false,
            error: null,
          };
        });
      } catch (error) {
        const errorMessage =
          error instanceof ApiError ? error.message : 'Failed to reorder circles';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Merge one circle into another
     */
    mergeCircles: async (targetCircleId: string, sourceCircleId: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const mergedCircle = await circlesApi.mergeCircles(targetCircleId, sourceCircleId);

        update((state) => ({
          ...state,
          circles: state.circles
            .filter((c) => c.id !== sourceCircleId)
            .map((c) => (c.id === targetCircleId ? mergedCircle : c)),
          isLoading: false,
          error: null,
        }));

        return mergedCircle;
      } catch (error) {
        const errorMessage = error instanceof ApiError ? error.message : 'Failed to merge circles';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Clear the store
     */
    clear: () => {
      set(initialState);
    },
  };
}

export const circles = createCirclesStore();

/**
 * Derived store: circles sorted by sort_order
 */
export const circlesList = derived(circles, ($circles) =>
  [...$circles.circles].sort((a, b) => a.sortOrder - b.sortOrder),
);

/**
 * Derived store: circles as a hierarchical tree
 */
export const circleHierarchy = derived(circles, ($circles): CircleWithHierarchy[] =>
  buildCircleHierarchy($circles.circles),
);

/**
 * Derived store: circles as a lookup map by ID
 */
export const circlesById = derived(
  circles,
  ($circles) => new Map<string, Circle>($circles.circles.map((c) => [c.id, c])),
);

/**
 * Get the full path for a circle (e.g., "Family → Close Friends")
 */
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

/**
 * Set circles for a friend
 */
export async function setFriendCircles(
  friendId: string,
  circleIds: string[],
): Promise<CircleSummary[]> {
  return circlesApi.setFriendCircles(friendId, circleIds);
}

/**
 * Add a friend to a circle
 */
export async function addFriendToCircle(
  friendId: string,
  circleId: string,
): Promise<CircleSummary> {
  return circlesApi.addFriendToCircle(friendId, circleId);
}

/**
 * Remove a friend from a circle
 */
export async function removeFriendFromCircle(friendId: string, circleId: string): Promise<void> {
  return circlesApi.removeFriendFromCircle(friendId, circleId);
}

// ============================================================================
// Favorites & Archive Helpers
// ============================================================================

/**
 * Toggle favorite status for a friend
 */
export async function toggleFavorite(friendId: string): Promise<boolean> {
  return circlesApi.toggleFavorite(friendId);
}

/**
 * Archive a friend
 */
export async function archiveFriend(friendId: string, reason?: string): Promise<void> {
  return circlesApi.archiveFriend(friendId, reason);
}

/**
 * Unarchive a friend
 */
export async function unarchiveFriend(friendId: string): Promise<void> {
  return circlesApi.unarchiveFriend(friendId);
}
