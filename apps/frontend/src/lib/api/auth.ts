import {
  FriendResponseSchema,
  PreferencesResponseSchema,
  type UserPreferences,
  UserResponseSchema,
  UserWithPreferencesResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';
import { type FriendCreateData, mapFriendCreateInput } from './friend-create-data.js';

export interface AuthApiOptions {
  client: ApiClient;
}

/** The account endpoints of the backend; sign-up, sign-in and sign-out go through Better Auth. */
export class AuthApi {
  private readonly client: ApiClient;

  public constructor(options: AuthApiOptions) {
    this.client = options.client;
  }

  public getCurrentUser() {
    return this.client.request(UserResponseSchema, '/api/users/me');
  }

  public getUserWithPreferences() {
    return this.client.request(UserWithPreferencesResponseSchema, '/api/auth/me');
  }

  /** Merges the given preferences into the stored ones. */
  public updatePreferences(preferences: UserPreferences) {
    return this.client.request(PreferencesResponseSchema, '/api/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }

  /** Creates the friend that represents the user, which completes the onboarding. */
  public createSelfProfile(data: FriendCreateData) {
    return this.client.request(FriendResponseSchema, '/api/users/me/self-profile', {
      method: 'POST',
      body: JSON.stringify(mapFriendCreateInput(data)),
    });
  }
}
