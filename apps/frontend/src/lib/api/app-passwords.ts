import { apiRequest } from './client.js';

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
