import { type } from 'arktype';
import { UserPreferencesSchema } from './user-preferences.js';

export const UserResponseSchema = type({
  externalId: 'string',
  email: 'string',
  'preferences?': UserPreferencesSchema,
  'createdAt?': 'string',
  'updatedAt?': 'string',
  /** External ID of the user's self-profile, absent until onboarding */
  'selfProfileId?': 'string',
  /** Display name of the user's self-profile, absent until onboarding */
  'displayName?': 'string',
  hasCompletedOnboarding: 'boolean',
});

export type UserResponse = typeof UserResponseSchema.infer;
