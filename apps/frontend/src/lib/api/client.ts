import { get } from 'svelte/store';
import type { ErrorResponse } from '$shared';
import { auth } from '../stores/auth.js';

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
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get the current access token from the auth store
 */
function getAccessToken(): string | null {
  const authState = get(auth);
  return authState.accessToken;
}

interface ApiRequestConfig {
  auth?: boolean; // default: true
}

/**
 * Helper function to make API requests with proper error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  config: ApiRequestConfig = {},
): Promise<T> {
  const { auth: useAuth = true } = config;
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (useAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
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
