import { get } from 'svelte/store';
import type {
  Encounter,
  EncounterInput,
  EncounterListResponse,
  EncounterUpdate,
  ErrorResponse,
  LastEncounterSummary,
} from '$shared';
import { auth } from '../stores/auth.js';
import { ApiError } from './auth.js';

// In production with single-domain deployment, use empty string for same-origin requests.
// In development, VITE_API_URL can point to the backend server if needed.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Get the current access token from the auth store
 */
function getAccessToken(): string | null {
  const authState = get(auth);
  return authState.accessToken;
}

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({
      error: 'An unknown error occurred',
    }));

    throw new ApiError(response.status, errorData.error, errorData.code, errorData.details);
  }

  return response.json();
}

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
