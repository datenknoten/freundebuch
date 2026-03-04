import type { Circle, CircleInput, CircleSummary } from '$shared';
import { apiRequest } from './client.js';

// ============================================================================
// Circle CRUD Operations
// ============================================================================

/**
 * Get all circles for the authenticated user
 */
export async function listCircles(): Promise<Circle[]> {
  return apiRequest<Circle[]>('/api/circles');
}

/**
 * Get a single circle by ID
 */
export async function getCircle(circleId: string): Promise<Circle> {
  return apiRequest<Circle>(`/api/circles/${circleId}`);
}

/**
 * Create a new circle
 */
export async function createCircle(input: CircleInput): Promise<Circle> {
  return apiRequest<Circle>('/api/circles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update a circle
 */
export async function updateCircle(circleId: string, input: Partial<CircleInput>): Promise<Circle> {
  return apiRequest<Circle>(`/api/circles/${circleId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * Delete a circle
 */
export async function deleteCircle(circleId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/api/circles/${circleId}`, {
    method: 'DELETE',
  });
}

/**
 * Batch reorder circles by updating their sort_order
 */
export async function reorderCircles(
  order: Array<{ id: string; sort_order: number }>,
): Promise<void> {
  await apiRequest<{ success: boolean }>('/api/circles/reorder', {
    method: 'PUT',
    body: JSON.stringify({ order }),
  });
}

/**
 * Merge one circle into another
 * Friends from the source circle are moved to the target, then the source is deleted
 */
export async function mergeCircles(
  targetCircleId: string,
  sourceCircleId: string,
): Promise<Circle> {
  return apiRequest<Circle>(`/api/circles/${targetCircleId}/merge`, {
    method: 'POST',
    body: JSON.stringify({ source_circle_id: sourceCircleId }),
  });
}

// ============================================================================
// Friend-Circle Assignment Operations
// ============================================================================

/**
 * Get all circles for a specific friend
 */
export async function getFriendCircles(friendId: string): Promise<CircleSummary[]> {
  return apiRequest<CircleSummary[]>(`/api/friends/${friendId}/circles`);
}

/**
 * Set circles for a friend (replaces all existing assignments)
 */
export async function setFriendCircles(
  friendId: string,
  circleIds: string[],
): Promise<CircleSummary[]> {
  return apiRequest<CircleSummary[]>(`/api/friends/${friendId}/circles`, {
    method: 'PUT',
    body: JSON.stringify({ circle_ids: circleIds }),
  });
}

/**
 * Add a friend to a single circle
 */
export async function addFriendToCircle(
  friendId: string,
  circleId: string,
): Promise<CircleSummary> {
  return apiRequest<CircleSummary>(`/api/friends/${friendId}/circles/${circleId}`, {
    method: 'POST',
  });
}

/**
 * Remove a friend from a circle
 */
export async function removeFriendFromCircle(friendId: string, circleId: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/friends/${friendId}/circles/${circleId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Favorites & Archive Operations
// ============================================================================

/**
 * Toggle the favorite status of a friend
 */
export async function toggleFavorite(friendId: string): Promise<boolean> {
  const result = await apiRequest<{ is_favorite: boolean }>(`/api/friends/${friendId}/favorite`, {
    method: 'POST',
  });
  return result.is_favorite;
}

/**
 * Archive a friend with an optional reason
 */
export async function archiveFriend(friendId: string, reason?: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/friends/${friendId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Unarchive a friend (restore from archive)
 */
export async function unarchiveFriend(friendId: string): Promise<void> {
  await apiRequest<{ message: string }>(`/api/friends/${friendId}/unarchive`, {
    method: 'POST',
  });
}
