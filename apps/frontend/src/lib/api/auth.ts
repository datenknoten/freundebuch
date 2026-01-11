import type {
  AuthResponse,
  Contact,
  ContactCreateInput,
  ErrorResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdatePreferencesRequest,
  User,
  UserPreferences,
} from '$shared';

// In production with single-domain deployment, use empty string for same-origin requests.
// In development, VITE_API_URL can point to the backend server if needed.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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
    credentials: 'include', // Important: send cookies with requests
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({
      error: 'An unknown error occurred',
    }));

    throw new ApiError(response.status, errorData.error, errorData.details);
  }

  return response.json();
}

/**
 * Register a new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Login an existing user
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Logout the current user
 */
export async function logout(): Promise<{ message: string }> {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * Refresh the access token
 * Uses session token from cookie by default
 */
export async function refresh(data?: RefreshRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/refresh', {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Request a password reset token
 */
export async function forgotPassword(
  data: ForgotPasswordRequest,
): Promise<{ message: string; resetToken?: string }> {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Reset password using a reset token
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
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
// Self-Contact (Onboarding)
// ============================================================================

/**
 * Get the current user's self-contact ID
 */
export async function getSelfContact(): Promise<{ selfContactId: string | null }> {
  return apiRequest('/api/users/me/self-contact', {
    method: 'GET',
  });
}

/**
 * Set an existing contact as the user's self-contact
 */
export async function setSelfContact(contactId: string): Promise<{ selfContactId: string }> {
  return apiRequest('/api/users/me/self-contact', {
    method: 'PUT',
    body: JSON.stringify({ contactId }),
  });
}

/**
 * Create a new contact and set it as the user's self-contact
 * Used during onboarding
 */
export async function createSelfContact(data: ContactCreateInput): Promise<Contact> {
  return apiRequest<Contact>('/api/users/me/self-contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
