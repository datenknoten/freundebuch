import type {
  Friend,
  FriendCreateInput,
  UpdatePreferencesRequest,
  User,
  UserPreferences,
} from '$shared';
import { apiRequest } from './client.js';

export { ApiError } from './client.js';

// Note: register, login, logout, refresh, forgotPassword, resetPassword
// are now handled by the Better Auth client (authClient) directly.
// See lib/auth-client.ts and lib/stores/auth.ts

/**
 * Get the current user's profile
 */
export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/api/users/me', {
    method: 'GET',
  });
}

/**
 * Update the current user's profile
 */
export async function updateCurrentUser(data: Partial<User>): Promise<User> {
  return apiRequest<User>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get the current user with preferences
 */
export async function getUserWithPreferences(): Promise<{
  user: User;
  preferences: UserPreferences;
}> {
  return apiRequest('/api/auth/me', {
    method: 'GET',
  });
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  data: UpdatePreferencesRequest,
): Promise<{ preferences: UserPreferences }> {
  return apiRequest('/api/auth/preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Self-Profile (Onboarding)
// ============================================================================

/**
 * Get the current user's self-profile ID
 */
export async function getSelfProfile(): Promise<{ selfProfileId: string | null }> {
  return apiRequest('/api/users/me/self-profile', {
    method: 'GET',
  });
}

/**
 * Set an existing friend as the user's self-profile
 */
export async function setSelfProfile(friendId: string): Promise<{ selfProfileId: string }> {
  return apiRequest('/api/users/me/self-profile', {
    method: 'PUT',
    body: JSON.stringify({ friendId }),
  });
}

/**
 * Create a new friend and set it as the user's self-profile
 * Used during onboarding
 */
export async function createSelfProfile(data: FriendCreateInput): Promise<Friend> {
  return apiRequest<Friend>('/api/users/me/self-profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
