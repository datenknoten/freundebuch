import { type } from 'arktype';
import { UserPreferencesSchema } from './user-preferences.js';

/** Response from PATCH /api/auth/preferences */
export const PreferencesResponseSchema = type({
  preferences: UserPreferencesSchema,
});

export type PreferencesResponse = typeof PreferencesResponseSchema.infer;
