import { apiRequest } from './client.js';

export interface AppPassword {
  externalId: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateAppPasswordResult extends AppPassword {
  /** The formatted password — shown once, right after creation. */
  password: string;
  /** First 8 characters of the raw password; only the create response has it. */
  passwordPrefix: string;
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
 * Revoke an app password.
 * DELETE /api/app-passwords/:id answers `{ success: true }`; a missing password is a 404.
 */
export async function revokeAppPassword(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/app-passwords/${id}`, {
    method: 'DELETE',
  });
}
