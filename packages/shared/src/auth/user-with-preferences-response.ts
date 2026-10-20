import type { User } from './user.js';
import type { UserPreferences } from './user-preferences.js';

/** Response from GET /api/auth/me */
export interface UserWithPreferencesResponse {
  user: User;
  preferences: UserPreferences;
}
