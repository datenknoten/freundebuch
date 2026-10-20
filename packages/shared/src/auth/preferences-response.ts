import { type } from 'arktype';
import { UserPreferencesSchema } from './user-preferences.js';

export const PreferencesResponseSchema = type({
  preferences: UserPreferencesSchema,
});

export type PreferencesResponse = typeof PreferencesResponseSchema.infer;
