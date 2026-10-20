import type { UserPreferences } from './user-preferences.js';

// User type
export interface User {
  externalId: string;
  email: string;
  preferences?: UserPreferences;
  createdAt?: string;
  updatedAt?: string;
  /** External ID of the user's self-profile (if set) */
  selfProfileId?: string;
  /** Display name of the user's self-profile (if set) */
  displayName?: string;
  /** Whether the user has completed onboarding (has a self-profile) */
  hasCompletedOnboarding: boolean;
}
