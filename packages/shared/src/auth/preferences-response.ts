import type { UserPreferences } from './user-preferences.js';

/** Response from PATCH /api/auth/preferences */
export interface PreferencesResponse {
  preferences: UserPreferences;
}
