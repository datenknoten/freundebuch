import { type } from 'arktype';
import { UserPreferencesSchema } from './user-preferences.js';
import { UserResponseSchema } from './user-response.js';

/** Response from GET /api/auth/me */
export const UserWithPreferencesResponseSchema = type({
  user: UserResponseSchema,
  preferences: UserPreferencesSchema,
});

export type UserWithPreferencesResponse = typeof UserWithPreferencesResponseSchema.infer;
