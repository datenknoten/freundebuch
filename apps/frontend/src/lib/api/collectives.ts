import type {
  AddressInput,
  AddressResponse,
  CollectiveCreateInput,
  CollectiveListResponse,
  CollectiveMemberResponse,
  CollectiveResponse,
  CollectiveTypeListResponse,
  CollectiveTypeResponse,
  CollectiveUpdateInput,
  EmailInput,
  EmailResponse,
  MembershipCreateInput,
  MembershipDeactivateInput,
  MembershipUpdateInput,
  PhoneInput,
  PhoneResponse,
  RelationshipPreviewInput,
  RelationshipPreviewResponse,
  UrlInput,
  UrlResponse,
} from '$shared';
import { apiRequest } from './client.js';

// ============================================================================
// Query Parameters
// ============================================================================

export interface CollectiveListParams {
  page?: number;
  pageSize?: number;
  typeId?: string;
  search?: string;
  includeDeleted?: boolean;
}

function buildQueryString(params: CollectiveListParams): string {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    searchParams.set('page_size', String(params.pageSize));
  }
  if (params.typeId) {
    searchParams.set('type_id', params.typeId);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.includeDeleted) {
    searchParams.set('include_deleted', 'true');
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============================================================================
// Collective Types Operations
// ============================================================================

/**
 * List all collective types available to the user
 */
export async function listCollectiveTypes(): Promise<CollectiveTypeListResponse> {
  return apiRequest<CollectiveTypeListResponse>('/api/collectives/types');
}

/**
 * Get a single collective type with roles and rules
 */
export async function getCollectiveType(typeId: string): Promise<CollectiveTypeResponse> {
  return apiRequest<CollectiveTypeResponse>(`/api/collectives/types/${typeId}`);
}

// ============================================================================
// Collective CRUD Operations
// ============================================================================

/**
 * List collectives with pagination and filtering
 */
export async function listCollectives(
  params: CollectiveListParams = {},
): Promise<CollectiveListResponse> {
  const queryString = buildQueryString(params);
  return apiRequest<CollectiveListResponse>(`/api/collectives${queryString}`);
}

/**
 * Get a single collective by ID
 */
export async function getCollective(collectiveId: string): Promise<CollectiveResponse> {
  return apiRequest<CollectiveResponse>(`/api/collectives/${collectiveId}`);
}

/**
 * Create a new collective
 */
export async function createCollective(input: CollectiveCreateInput): Promise<CollectiveResponse> {
  return apiRequest<CollectiveResponse>('/api/collectives', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update a collective
 */
export async function updateCollective(
  collectiveId: string,
  input: CollectiveUpdateInput,
): Promise<CollectiveResponse> {
  return apiRequest<CollectiveResponse>(`/api/collectives/${collectiveId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * Delete (soft delete) a collective
 */
export async function deleteCollective(collectiveId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/api/collectives/${collectiveId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Membership Operations
// ============================================================================

/**
 * Preview relationships that would be created when adding a member
 */
export async function previewMemberRelationships(
  collectiveId: string,
  input: RelationshipPreviewInput,
  options?: { signal?: AbortSignal },
): Promise<RelationshipPreviewResponse> {
  return apiRequest<RelationshipPreviewResponse>(
    `/api/collectives/${collectiveId}/members/preview`,
    {
      method: 'POST',
      body: JSON.stringify(input),
      signal: options?.signal,
    },
  );
}

/**
 * Add a member to a collective
 */
export async function addMember(
  collectiveId: string,
  input: MembershipCreateInput,
): Promise<CollectiveMemberResponse> {
  return apiRequest<CollectiveMemberResponse>(`/api/collectives/${collectiveId}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Remove a member from a collective
 */
export async function removeMember(collectiveId: string, memberId: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/api/collectives/${collectiveId}/members/${memberId}`, {
    method: 'DELETE',
  });
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  collectiveId: string,
  memberId: string,
  input: MembershipUpdateInput,
): Promise<CollectiveMemberResponse> {
  return apiRequest<CollectiveMemberResponse>(
    `/api/collectives/${collectiveId}/members/${memberId}/role`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

/**
 * Deactivate a member
 */
export async function deactivateMember(
  collectiveId: string,
  memberId: string,
  input: MembershipDeactivateInput = {},
): Promise<CollectiveMemberResponse> {
  return apiRequest<CollectiveMemberResponse>(
    `/api/collectives/${collectiveId}/members/${memberId}/deactivate`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

/**
 * Reactivate a member
 */
export async function reactivateMember(
  collectiveId: string,
  memberId: string,
): Promise<CollectiveMemberResponse> {
  return apiRequest<CollectiveMemberResponse>(
    `/api/collectives/${collectiveId}/members/${memberId}/reactivate`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

// ============================================================================
// Phone Operations
// ============================================================================

export async function listPhones(collectiveId: string): Promise<PhoneResponse[]> {
  return apiRequest<PhoneResponse[]>(`/api/collectives/${collectiveId}/phones`);
}

export async function addPhone(collectiveId: string, data: PhoneInput): Promise<PhoneResponse> {
  return apiRequest<PhoneResponse>(`/api/collectives/${collectiveId}/phones`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePhone(
  collectiveId: string,
  phoneId: string,
  data: Partial<PhoneInput>,
): Promise<PhoneResponse> {
  return apiRequest<PhoneResponse>(`/api/collectives/${collectiveId}/phones/${phoneId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePhone(
  collectiveId: string,
  phoneId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/collectives/${collectiveId}/phones/${phoneId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Email Operations
// ============================================================================

export async function listEmails(collectiveId: string): Promise<EmailResponse[]> {
  return apiRequest<EmailResponse[]>(`/api/collectives/${collectiveId}/emails`);
}

export async function addEmail(collectiveId: string, data: EmailInput): Promise<EmailResponse> {
  return apiRequest<EmailResponse>(`/api/collectives/${collectiveId}/emails`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEmail(
  collectiveId: string,
  emailId: string,
  data: Partial<EmailInput>,
): Promise<EmailResponse> {
  return apiRequest<EmailResponse>(`/api/collectives/${collectiveId}/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEmail(
  collectiveId: string,
  emailId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/collectives/${collectiveId}/emails/${emailId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Address Operations
// ============================================================================

export async function listAddresses(collectiveId: string): Promise<AddressResponse[]> {
  return apiRequest<AddressResponse[]>(`/api/collectives/${collectiveId}/addresses`);
}

export async function addAddress(
  collectiveId: string,
  data: AddressInput,
): Promise<AddressResponse> {
  return apiRequest<AddressResponse>(`/api/collectives/${collectiveId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAddress(
  collectiveId: string,
  addressId: string,
  data: Partial<AddressInput>,
): Promise<AddressResponse> {
  return apiRequest<AddressResponse>(`/api/collectives/${collectiveId}/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAddress(
  collectiveId: string,
  addressId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/collectives/${collectiveId}/addresses/${addressId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// URL Operations
// ============================================================================

export async function listUrls(collectiveId: string): Promise<UrlResponse[]> {
  return apiRequest<UrlResponse[]>(`/api/collectives/${collectiveId}/urls`);
}

export async function addUrl(collectiveId: string, data: UrlInput): Promise<UrlResponse> {
  return apiRequest<UrlResponse>(`/api/collectives/${collectiveId}/urls`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUrl(
  collectiveId: string,
  urlId: string,
  data: Partial<UrlInput>,
): Promise<UrlResponse> {
  return apiRequest<UrlResponse>(`/api/collectives/${collectiveId}/urls/${urlId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUrl(collectiveId: string, urlId: string): Promise<{ message: string }> {
  return apiRequest(`/api/collectives/${collectiveId}/urls/${urlId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Circle Operations
// ============================================================================

export interface CollectiveCircleInfo {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface AvailableCircleInfo {
  id: string;
  name: string;
  color: string | null;
}

export async function getCollectiveCircles(collectiveId: string): Promise<CollectiveCircleInfo[]> {
  return apiRequest<CollectiveCircleInfo[]>(`/api/collectives/${collectiveId}/circles`);
}

export async function getAvailableCircles(collectiveId: string): Promise<AvailableCircleInfo[]> {
  return apiRequest<AvailableCircleInfo[]>(`/api/collectives/${collectiveId}/circles/available`);
}

export async function addCollectiveToCircle(
  collectiveId: string,
  circleId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/collectives/${collectiveId}/circles/${circleId}`, {
    method: 'POST',
  });
}

export async function removeCollectiveFromCircle(
  collectiveId: string,
  circleId: string,
): Promise<{ message: string }> {
  return apiRequest(`/api/collectives/${collectiveId}/circles/${circleId}`, {
    method: 'DELETE',
  });
}
