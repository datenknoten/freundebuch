import type {
  AddressInput,
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
  Email,
  EmailInput,
  PaginatedContactList,
  Phone,
  PhoneInput,
  Url,
  UrlInput,
  Address,
} from '$shared';
import { ApiError } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Helper function to make API requests with proper error handling
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
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
