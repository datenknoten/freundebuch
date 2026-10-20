import { UserPreferencesSchema } from '@freundebuch/shared/index.js';

export function parseUserPreferences(value: unknown) {
  return UserPreferencesSchema.assert(value);
}
