import { get } from 'svelte/store';
import type {
  Address,
  AddressInput,
  Contact,
  ContactCreateInput,
  ContactDate,
  ContactSearchResult,
  ContactUpdateInput,
  DateInput,
  Email,
  EmailInput,
  MetInfo,
  MetInfoInput,
  PaginatedContactList,
  Phone,
  PhoneInput,
  Relationship,
  RelationshipInput,
  RelationshipTypesGrouped,
  RelationshipUpdateInput,
  SocialProfile,
  SocialProfileInput,
  Url,
  UrlInput,
} from '$shared';
import { auth } from '../stores/auth.js';
import { ApiError } from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'An unknown error occurred',
    }));

    throw new ApiError(response.status, errorData.error, errorData.details);
  }

  return response.json();
}

// ============================================================================
// Contact CRUD Operations
// ============================================================================

export interface ContactListParams {
  page?: number;
  pageSize?: number;
  sortBy?: 'display_name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get paginated list of contacts
 */
export async function listContacts(params: ContactListParams = {}): Promise<PaginatedContactList> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  const endpoint = `/api/contacts${query ? `?${query}` : ''}`;

  return apiRequest<PaginatedContactList>(endpoint);
}

/**
 * Get a single contact by ID
 */
export async function getContact(id: string): Promise<Contact> {
  return apiRequest<Contact>(`/api/contacts/${id}`);
}

/**
 * Create a new contact
 */
export async function createContact(data: ContactCreateInput): Promise<Contact> {
  return apiRequest<Contact>('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing contact
 */
export async function updateContact(id: string, data: ContactUpdateInput): Promise<Contact> {
  return apiRequest<Contact>(`/api/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a contact (soft delete)
 */
export async function deleteContact(id: string): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Phone Operations
// ============================================================================

/**
 * Add a phone number to a contact
 */
export async function addPhone(contactId: string, data: PhoneInput): Promise<Phone> {
  return apiRequest<Phone>(`/api/contacts/${contactId}/phones`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a phone number
 */
export async function updatePhone(
  contactId: string,
  phoneId: string,
  data: Partial<PhoneInput>,
): Promise<Phone> {
  return apiRequest<Phone>(`/api/contacts/${contactId}/phones/${phoneId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a phone number
 */
export async function deletePhone(
  contactId: string,
  phoneId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/phones/${phoneId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Email Operations
// ============================================================================

/**
 * Add an email to a contact
 */
export async function addEmail(contactId: string, data: EmailInput): Promise<Email> {
  return apiRequest<Email>(`/api/contacts/${contactId}/emails`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an email
 */
export async function updateEmail(
  contactId: string,
  emailId: string,
  data: Partial<EmailInput>,
): Promise<Email> {
  return apiRequest<Email>(`/api/contacts/${contactId}/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an email
 */
export async function deleteEmail(
  contactId: string,
  emailId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/emails/${emailId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Address Operations
// ============================================================================

/**
 * Add an address to a contact
 */
export async function addAddress(contactId: string, data: AddressInput): Promise<Address> {
  return apiRequest<Address>(`/api/contacts/${contactId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an address
 */
export async function updateAddress(
  contactId: string,
  addressId: string,
  data: Partial<AddressInput>,
): Promise<Address> {
  return apiRequest<Address>(`/api/contacts/${contactId}/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an address
 */
export async function deleteAddress(
  contactId: string,
  addressId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/addresses/${addressId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// URL Operations
// ============================================================================

/**
 * Add a URL to a contact
 */
export async function addUrl(contactId: string, data: UrlInput): Promise<Url> {
  return apiRequest<Url>(`/api/contacts/${contactId}/urls`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a URL
 */
export async function updateUrl(
  contactId: string,
  urlId: string,
  data: Partial<UrlInput>,
): Promise<Url> {
  return apiRequest<Url>(`/api/contacts/${contactId}/urls/${urlId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a URL
 */
export async function deleteUrl(contactId: string, urlId: string): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/urls/${urlId}`, {
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
 * Upload a photo for a contact
 */
export async function uploadPhoto(contactId: string, file: File): Promise<PhotoUploadResult> {
  const formData = new FormData();
  formData.append('photo', file);

  const url = `${API_BASE_URL}/api/contacts/${contactId}/photo`;
  const accessToken = getAccessToken();

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'An unknown error occurred',
    }));

    throw new ApiError(response.status, errorData.error, errorData.details);
  }

  return response.json();
}

/**
 * Delete a contact's photo
 */
export async function deletePhoto(contactId: string): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/photo`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Date Operations (Epic 1B)
// ============================================================================

/**
 * Add an important date to a contact
 */
export async function addDate(contactId: string, data: DateInput): Promise<ContactDate> {
  return apiRequest<ContactDate>(`/api/contacts/${contactId}/dates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an important date
 */
export async function updateDate(
  contactId: string,
  dateId: string,
  data: DateInput,
): Promise<ContactDate> {
  return apiRequest<ContactDate>(`/api/contacts/${contactId}/dates/${dateId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an important date
 */
export async function deleteDate(contactId: string, dateId: string): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/dates/${dateId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Met Info Operations (Epic 1B)
// ============================================================================

/**
 * Set or update how/where met information (upsert)
 */
export async function setMetInfo(contactId: string, data: MetInfoInput): Promise<MetInfo> {
  return apiRequest<MetInfo>(`/api/contacts/${contactId}/met-info`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete how/where met information
 */
export async function deleteMetInfo(contactId: string): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/met-info`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Social Profile Operations (Epic 1B)
// ============================================================================

/**
 * Add a social profile to a contact
 */
export async function addSocialProfile(
  contactId: string,
  data: SocialProfileInput,
): Promise<SocialProfile> {
  return apiRequest<SocialProfile>(`/api/contacts/${contactId}/social-profiles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a social profile
 */
export async function updateSocialProfile(
  contactId: string,
  profileId: string,
  data: SocialProfileInput,
): Promise<SocialProfile> {
  return apiRequest<SocialProfile>(`/api/contacts/${contactId}/social-profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a social profile
 */
export async function deleteSocialProfile(
  contactId: string,
  profileId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/social-profiles/${profileId}`, {
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
  return apiRequest<RelationshipTypesGrouped>('/api/contacts/relationship-types');
}

/**
 * Search contacts by name (for autocomplete in relationship picker)
 */
export async function searchContacts(
  query: string,
  exclude?: string,
  limit?: number,
): Promise<ContactSearchResult[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  if (exclude) searchParams.set('exclude', exclude);
  if (limit) searchParams.set('limit', limit.toString());

  return apiRequest<ContactSearchResult[]>(`/api/contacts/search?${searchParams.toString()}`);
}

/**
 * Add a relationship to a contact
 */
export async function addRelationship(
  contactId: string,
  data: RelationshipInput,
): Promise<Relationship> {
  return apiRequest<Relationship>(`/api/contacts/${contactId}/relationships`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a relationship
 */
export async function updateRelationship(
  contactId: string,
  relationshipId: string,
  data: RelationshipUpdateInput,
): Promise<Relationship> {
  return apiRequest<Relationship>(`/api/contacts/${contactId}/relationships/${relationshipId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a relationship
 */
export async function deleteRelationship(
  contactId: string,
  relationshipId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/contacts/${contactId}/relationships/${relationshipId}`, {
    method: 'DELETE',
  });
}
