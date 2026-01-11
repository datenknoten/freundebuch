import { get } from 'svelte/store';
import type { ErrorResponse } from '$shared';
import { auth } from '../stores/auth.js';
import { ApiError } from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface AppPassword {
  externalId: string;
  name: string;
  passwordPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateAppPasswordResult {
  appPassword: {
    externalId: string;
    name: string;
    passwordPrefix: string;
    createdAt: string;
  };
  password: string;
}

function getAccessToken(): string | null {
  const authState = get(auth);
  return authState.accessToken;
}

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

/**
 * List all active app passwords for the current user
 */
export async function listAppPasswords(): Promise<AppPassword[]> {
  return apiRequest<AppPassword[]>('/api/app-passwords');
}

/**
 * Create a new app password
 * Note: The password is only returned once on creation
 */
export async function createAppPassword(name: string): Promise<CreateAppPasswordResult> {
  return apiRequest<CreateAppPasswordResult>('/api/app-passwords', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Revoke an app password
 */
export async function revokeAppPassword(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/app-passwords/${id}`, {
    method: 'DELETE',
  });
}
