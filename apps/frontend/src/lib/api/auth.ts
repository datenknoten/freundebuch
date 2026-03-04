import type {
  AuthResponse,
  ForgotPasswordRequest,
  Friend,
  FriendCreateInput,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdatePreferencesRequest,
  User,
  UserPreferences,
} from '$shared';
import { apiRequest } from './client.js';

export { ApiError } from './client.js';

/**
 * Register a new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    { auth: false },
  );
}

/**
 * Login an existing user
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    { auth: false },
  );
}

/**
 * Logout the current user
 */
export async function logout(): Promise<{ message: string }> {
  return apiRequest(
    '/api/auth/logout',
    {
      method: 'POST',
    },
    { auth: false },
  );
}

/**
 * Refresh the access token
 * Uses session token from cookie by default
 */
export async function refresh(data?: RefreshRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    '/api/auth/refresh',
    {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    },
    { auth: false },
  );
}

/**
 * Request a password reset token
 */
export async function forgotPassword(
  data: ForgotPasswordRequest,
): Promise<{ message: string; resetToken?: string }> {
  return apiRequest(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    { auth: false },
  );
}

/**
 * Reset password using a reset token
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
  return apiRequest(
    '/api/auth/reset-password',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    { auth: false },
  );
}

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
