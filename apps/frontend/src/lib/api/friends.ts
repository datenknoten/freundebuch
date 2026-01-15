import { get } from 'svelte/store';
import type {
  Address,
  AddressInput,
  DateInput,
  Email,
  EmailInput,
  ErrorResponse,
  FacetedSearchResponse,
  FacetFilters,
  Friend,
  FriendCreateInput,
  FriendDate,
  FriendSearchResult,
  FriendUpdateInput,
  GlobalSearchResult,
  MetInfo,
  MetInfoInput,
  NetworkGraphData,
  PaginatedFriendList,
  PaginatedSearchResponse,
  Phone,
  PhoneInput,
  Relationship,
  RelationshipInput,
  RelationshipTypesGrouped,
  RelationshipUpdateInput,
  SearchSortBy,
  SocialProfile,
  SocialProfileInput,
  UpcomingDate,
  Url,
  UrlInput,
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
// Friend CRUD Operations
// ============================================================================

export interface FriendListParams {
  page?: number;
  pageSize?: number;
  sortBy?: 'display_name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  // Epic 4: Categorization & Organization filters
  favorites?: boolean;
  archived?: boolean | 'only'; // true = include archived, 'only' = only archived, false/undefined = exclude
}

/**
 * Get paginated list of friends
 */
export async function listFriends(params: FriendListParams = {}): Promise<PaginatedFriendList> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  // Epic 4: Categorization & Organization filters
  if (params.favorites) searchParams.set('favorites', 'true');
  if (params.archived === true) searchParams.set('archived', 'true');
  if (params.archived === 'only') searchParams.set('archived', 'only');

  const query = searchParams.toString();
  const endpoint = `/api/friends${query ? `?${query}` : ''}`;

  return apiRequest<PaginatedFriendList>(endpoint);
}

/**
 * Get a single friend by ID
 */
export async function getFriend(id: string): Promise<Friend> {
  return apiRequest<Friend>(`/api/friends/${id}`);
}

/**
 * Create a new friend
 */
export async function createFriend(data: FriendCreateInput): Promise<Friend> {
  return apiRequest<Friend>('/api/friends', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing friend
 */
export async function updateFriend(id: string, data: FriendUpdateInput): Promise<Friend> {
  return apiRequest<Friend>(`/api/friends/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a friend (soft delete)
 */
export async function deleteFriend(id: string): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Phone Operations
// ============================================================================

/**
 * Add a phone number to a friend
 */
export async function addPhone(friendId: string, data: PhoneInput): Promise<Phone> {
  return apiRequest<Phone>(`/api/friends/${friendId}/phones`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a phone number
 */
export async function updatePhone(
  friendId: string,
  phoneId: string,
  data: Partial<PhoneInput>,
): Promise<Phone> {
  return apiRequest<Phone>(`/api/friends/${friendId}/phones/${phoneId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a phone number
 */
export async function deletePhone(friendId: string, phoneId: string): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/phones/${phoneId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Email Operations
// ============================================================================

/**
 * Add an email to a friend
 */
export async function addEmail(friendId: string, data: EmailInput): Promise<Email> {
  return apiRequest<Email>(`/api/friends/${friendId}/emails`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an email
 */
export async function updateEmail(
  friendId: string,
  emailId: string,
  data: Partial<EmailInput>,
): Promise<Email> {
  return apiRequest<Email>(`/api/friends/${friendId}/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an email
 */
export async function deleteEmail(friendId: string, emailId: string): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/emails/${emailId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Address Operations
// ============================================================================

/**
 * Add an address to a friend
 */
export async function addAddress(friendId: string, data: AddressInput): Promise<Address> {
  return apiRequest<Address>(`/api/friends/${friendId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an address
 */
export async function updateAddress(
  friendId: string,
  addressId: string,
  data: Partial<AddressInput>,
): Promise<Address> {
  return apiRequest<Address>(`/api/friends/${friendId}/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an address
 */
export async function deleteAddress(
  friendId: string,
  addressId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/addresses/${addressId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// URL Operations
// ============================================================================

/**
 * Add a URL to a friend
 */
export async function addUrl(friendId: string, data: UrlInput): Promise<Url> {
  return apiRequest<Url>(`/api/friends/${friendId}/urls`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a URL
 */
export async function updateUrl(
  friendId: string,
  urlId: string,
  data: Partial<UrlInput>,
): Promise<Url> {
  return apiRequest<Url>(`/api/friends/${friendId}/urls/${urlId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a URL
 */
export async function deleteUrl(friendId: string, urlId: string): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/urls/${urlId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Photo Operations
// ============================================================================

export interface PhotoUploadResult {
  photoUrl: string;
  photoThumbnailUrl: string;
}

/**
 * Upload a photo for a friend
 */
export async function uploadPhoto(friendId: string, file: File): Promise<PhotoUploadResult> {
  const formData = new FormData();
  formData.append('photo', file);

  const url = `${API_BASE_URL}/api/friends/${friendId}/photo`;
  const accessToken = getAccessToken();

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
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

/**
 * Delete a friend's photo
 */
export async function deletePhoto(friendId: string): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/photo`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Date Operations (Epic 1B)
// ============================================================================

/**
 * Add an important date to a friend
 */
export async function addDate(friendId: string, data: DateInput): Promise<FriendDate> {
  return apiRequest<FriendDate>(`/api/friends/${friendId}/dates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an important date
 */
export async function updateDate(
  friendId: string,
  dateId: string,
  data: DateInput,
): Promise<FriendDate> {
  return apiRequest<FriendDate>(`/api/friends/${friendId}/dates/${dateId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an important date
 */
export async function deleteDate(friendId: string, dateId: string): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/dates/${dateId}`, {
    method: 'DELETE',
  });
}

/**
 * Get upcoming important dates across all friends
 */
export async function getUpcomingDates(options?: {
  days?: number;
  limit?: number;
}): Promise<UpcomingDate[]> {
  const searchParams = new URLSearchParams();
  if (options?.days) searchParams.set('days', options.days.toString());
  if (options?.limit) searchParams.set('limit', options.limit.toString());
  const queryString = searchParams.toString();
  const endpoint = `/api/friends/dates/upcoming${queryString ? `?${queryString}` : ''}`;
  return apiRequest<UpcomingDate[]>(endpoint);
}

// ============================================================================
// Met Info Operations (Epic 1B)
// ============================================================================

/**
 * Set or update how/where met information (upsert)
 */
export async function setMetInfo(friendId: string, data: MetInfoInput): Promise<MetInfo> {
  return apiRequest<MetInfo>(`/api/friends/${friendId}/met-info`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete how/where met information
 */
export async function deleteMetInfo(friendId: string): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/met-info`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Social Profile Operations (Epic 1B)
// ============================================================================

/**
 * Add a social profile to a friend
 */
export async function addSocialProfile(
  friendId: string,
  data: SocialProfileInput,
): Promise<SocialProfile> {
  return apiRequest<SocialProfile>(`/api/friends/${friendId}/social-profiles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a social profile
 */
export async function updateSocialProfile(
  friendId: string,
  profileId: string,
  data: SocialProfileInput,
): Promise<SocialProfile> {
  return apiRequest<SocialProfile>(`/api/friends/${friendId}/social-profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a social profile
 */
export async function deleteSocialProfile(
  friendId: string,
  profileId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/social-profiles/${profileId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Relationship Operations (Epic 1D)
// ============================================================================

/**
 * Get all relationship types grouped by category
 */
export async function getRelationshipTypes(): Promise<RelationshipTypesGrouped> {
  return apiRequest<RelationshipTypesGrouped>('/api/friends/relationship-types');
}

/**
 * Search friends by name (for autocomplete in relationship picker)
 */
export async function searchFriends(
  query: string,
  exclude?: string,
  limit?: number,
): Promise<FriendSearchResult[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  if (exclude) searchParams.set('exclude', exclude);
  if (limit) searchParams.set('limit', limit.toString());

  return apiRequest<FriendSearchResult[]>(`/api/friends/search?${searchParams.toString()}`);
}

/**
 * Add a relationship to a friend
 */
export async function addRelationship(
  friendId: string,
  data: RelationshipInput,
): Promise<Relationship> {
  return apiRequest<Relationship>(`/api/friends/${friendId}/relationships`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a relationship
 */
export async function updateRelationship(
  friendId: string,
  relationshipId: string,
  data: RelationshipUpdateInput,
): Promise<Relationship> {
  return apiRequest<Relationship>(`/api/friends/${friendId}/relationships/${relationshipId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a relationship
 */
export async function deleteRelationship(
  friendId: string,
  relationshipId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/friends/${friendId}/relationships/${relationshipId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Full-Text Search Operations (Epic 10)
// ============================================================================

/**
 * Full-text search across friends with relevance ranking
 * Searches: names, organization, job title, work notes, emails, phones,
 * relationship notes, and met context
 */
export async function fullTextSearch(query: string, limit?: number): Promise<GlobalSearchResult[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  if (limit) searchParams.set('limit', limit.toString());

  return apiRequest<GlobalSearchResult[]>(`/api/friends/search/full?${searchParams.toString()}`);
}

export interface PaginatedSearchParams {
  query: string;
  page?: number;
  pageSize?: number;
  sortBy?: SearchSortBy;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated full-text search with sorting options
 * Used by in-page search for friends list
 */
export async function paginatedSearch(
  params: PaginatedSearchParams,
): Promise<PaginatedSearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.query);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  return apiRequest<PaginatedSearchResponse>(
    `/api/friends/search/paginated?${searchParams.toString()}`,
  );
}

/** Parameters for faceted search */
export interface FacetedSearchParams {
  query?: string; // Optional - can search with query, filters, or both
  page?: number;
  pageSize?: number;
  sortBy?: SearchSortBy;
  sortOrder?: 'asc' | 'desc';
  filters?: FacetFilters;
  includeFacets?: boolean;
}

/**
 * Faceted full-text search with filter support
 * Supports filtering by location, professional, and relationship facets
 * Can be used with a search query, filters, or both
 */
export async function facetedSearch(params: FacetedSearchParams): Promise<FacetedSearchResponse> {
  const searchParams = new URLSearchParams();

  // Query is optional - can search with query, filters, or just get facets
  if (params.query) searchParams.set('q', params.query);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.includeFacets) searchParams.set('includeFacets', 'true');

  // Add filter parameters (comma-separated values)
  if (params.filters?.country?.length) {
    searchParams.set('country', params.filters.country.join(','));
  }
  if (params.filters?.city?.length) {
    searchParams.set('city', params.filters.city.join(','));
  }
  if (params.filters?.organization?.length) {
    searchParams.set('organization', params.filters.organization.join(','));
  }
  if (params.filters?.job_title?.length) {
    searchParams.set('job_title', params.filters.job_title.join(','));
  }
  if (params.filters?.department?.length) {
    searchParams.set('department', params.filters.department.join(','));
  }
  if (params.filters?.relationship_category?.length) {
    searchParams.set('relationship_category', params.filters.relationship_category.join(','));
  }
  if (params.filters?.circles?.length) {
    searchParams.set('circles', params.filters.circles.join(','));
  }

  return apiRequest<FacetedSearchResponse>(
    `/api/friends/search/faceted?${searchParams.toString()}`,
  );
}

/**
 * Get user's recent search queries
 */
export async function getRecentSearches(limit?: number): Promise<string[]> {
  const searchParams = new URLSearchParams();
  if (limit) searchParams.set('limit', limit.toString());

  const query = searchParams.toString();
  const endpoint = `/api/friends/search/recent${query ? `?${query}` : ''}`;

  return apiRequest<string[]>(endpoint);
}

/**
 * Add or update a recent search query
 */
export async function addRecentSearch(query: string): Promise<void> {
  await apiRequest<{ success: boolean }>('/api/friends/search/recent', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

/**
 * Delete a specific recent search
 */
export async function deleteRecentSearch(query: string): Promise<void> {
  await apiRequest<{ success: boolean }>(
    `/api/friends/search/recent/${encodeURIComponent(query)}`,
    {
      method: 'DELETE',
    },
  );
}

/**
 * Clear all recent searches
 */
export async function clearRecentSearches(): Promise<void> {
  await apiRequest<{ success: boolean }>('/api/friends/search/recent', {
    method: 'DELETE',
  });
}

// ============================================================================
// Network Graph Operations (Dashboard visualization)
// ============================================================================

/**
 * Get network graph data for visualization
 * Returns all non-archived friends as nodes and their relationships as links
 */
export async function getNetworkGraphData(): Promise<NetworkGraphData> {
  return apiRequest<NetworkGraphData>('/api/friends/network-graph');
}
