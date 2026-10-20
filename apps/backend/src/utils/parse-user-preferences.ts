import { type UserPreferences, UserPreferencesSchema } from '@freundebuch/shared/index.js';

export function parseUserPreferences(value: unknown): UserPreferences {
  return UserPreferencesSchema.assert(value);
}
