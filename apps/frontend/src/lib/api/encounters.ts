import type {
  Encounter,
  EncounterInput,
  EncounterListResponse,
  EncounterUpdate,
  LastEncounterSummary,
} from '$shared';
import { ApiError } from './auth.js';
import { apiRequest } from './client.js';

// ============================================================================
// Query Parameters
// ============================================================================

export interface EncounterListParams {
  page?: number;
  pageSize?: number;
  friendId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

function buildQueryString(params: EncounterListParams): string {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    searchParams.set('page_size', String(params.pageSize));
  }
  if (params.friendId) {
    searchParams.set('friend_id', params.friendId);
  }
  if (params.fromDate) {
    searchParams.set('from_date', params.fromDate);
  }
  if (params.toDate) {
    searchParams.set('to_date', params.toDate);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============================================================================
// Encounter CRUD Operations
// ============================================================================

/**
 * List encounters with pagination and filtering
 */
export async function listEncounters(
  params: EncounterListParams = {},
): Promise<EncounterListResponse> {
  const queryString = buildQueryString(params);
  return apiRequest<EncounterListResponse>(`/api/encounters${queryString}`);
}

/**
 * Get a single encounter by ID
 */
export async function getEncounter(encounterId: string): Promise<Encounter> {
  return apiRequest<Encounter>(`/api/encounters/${encounterId}`);
}

/**
 * Create a new encounter
 */
export async function createEncounter(input: EncounterInput): Promise<Encounter> {
  return apiRequest<Encounter>('/api/encounters', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update an encounter
 */
export async function updateEncounter(
  encounterId: string,
  input: EncounterUpdate,
): Promise<Encounter> {
  return apiRequest<Encounter>(`/api/encounters/${encounterId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * Delete an encounter
 */
export async function deleteEncounter(encounterId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/api/encounters/${encounterId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Friend-specific Encounter Operations
// ============================================================================

/**
 * Get encounters for a specific friend
 */
export async function getFriendEncounters(
  friendId: string,
  params: Omit<EncounterListParams, 'friendId'> = {},
): Promise<EncounterListResponse> {
  const queryString = buildQueryString({ ...params, friendId: undefined });
  return apiRequest<EncounterListResponse>(`/api/friends/${friendId}/encounters${queryString}`);
}

/**
 * Get the most recent encounter with a specific friend
 */
export async function getLastEncounter(friendId: string): Promise<LastEncounterSummary | null> {
  try {
    return await apiRequest<LastEncounterSummary>(`/api/friends/${friendId}/encounters/last`);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}
