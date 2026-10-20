import { ValidationError } from '@datenknoten/kit';
import type {
  FriendCreateInput,
  FriendResponse,
  PreferencesResponse,
  UserPreferences,
  UserResponse,
  UserWithPreferencesResponse,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { FriendNotFoundError } from '../errors/friend-not-found.error.js';
import { SignupDisabledError } from '../errors/signup-disabled.error.js';
import { UserNotFoundError } from '../errors/user-not-found.error.js';
import type { AuthContext } from '../middleware/auth.js';
import {
  getUserSelfProfile,
  getUserWithPreferences,
  getUserWithSelfProfile,
  hasSelfProfile,
  type IGetUserWithSelfProfileResult,
  setUserSelfProfile,
  updateUserPreferences,
} from '../models/queries/users.queries.js';
import { parseUserPreferences } from '../utils/parse-user-preferences.js';
import { toJson } from '../utils/to-json.js';
import type { FriendsService } from './friends/friends.service.js';

export interface UsersServiceOptions {
  db: pg.Pool;
  logger: Logger;
  friendsService: FriendsService;
  isSignupDisabled: boolean;
}

/**
 * Reads and writes the current user's own record and self-profile.
 *
 * These four operations were inline in `routes/users.ts`, which meant the
 * `User` DTO was assembled in three places and one path threw a raw `Error`.
 */
export class UsersService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;
  private readonly friendsService: FriendsService;
  private readonly isSignupDisabled: boolean;

  public constructor(options: UsersServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
    this.friendsService = options.friendsService;
    this.isSignupDisabled = options.isSignupDisabled;
  }

  public async hasSelfProfile(userId: string): Promise<boolean> {
    const result = await hasSelfProfile.run({ userExternalId: userId }, this.db);
    return result[0]?.has_self_profile === true;
  }

  /**
   * Registration gate for private instances. Better Auth's `disableSignUp`
   * answers 400; the auth route calls this first so the client gets the
   * documented 403 SIGNUP_DISABLED.
   */
  public assertSignupAllowed(): void {
    if (this.isSignupDisabled) {
      throw new SignupDisabledError();
    }
  }

  public async getMeWithPreferences(authUser: AuthContext): Promise<UserWithPreferencesResponse> {
    // Look up the self-profile external_id and preferences from auth."user"
    // directly instead of trusting the session: the session cookie cache (5 min)
    // holds a stale null right after onboarding sets the self-profile via SQL,
    // which trapped users in an onboarding redirect loop until the cache expired,
    // and it serves stale preferences right after a PATCH.
    const result = await getUserSelfProfile.run({ userExternalId: authUser.userId }, this.db);
    const selfProfileExternalId = result[0]?.self_profile_external_id ?? null;
    const selfProfileDisplayName = result[0]?.self_profile_display_name ?? null;

    return {
      user: {
        externalId: authUser.userId,
        email: authUser.email,
        selfProfileId: selfProfileExternalId ?? undefined,
        displayName: selfProfileDisplayName ?? undefined,
        hasCompletedOnboarding: selfProfileExternalId !== null,
      },
      // Same reason as selfProfileId above: session.user.preferences is the
      // cached copy, so a language change reverted on reload until it expired.
      preferences: parseUserPreferences(result[0]?.preferences ?? {}),
    };
  }

  public async updatePreferences(
    userId: string,
    input: UserPreferences,
  ): Promise<PreferencesResponse> {
    // Get current preferences
    const users = await getUserWithPreferences.run({ externalId: userId }, this.db);

    if (users.length === 0) {
      throw new UserNotFoundError(userId);
    }

    const user = users[0];
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Merge with existing preferences
    const currentPreferences = parseUserPreferences(user.preferences ?? {});
    const newPreferences = {
      ...currentPreferences,
      ...input,
    };

    // Update in database
    const result = await updateUserPreferences.run(
      {
        externalId: userId,
        preferences: toJson(newPreferences),
      },
      this.db,
    );

    if (result.length === 0) {
      throw new UserNotFoundError(userId);
    }

    this.logger.info({ userId }, 'User preferences updated');

    return {
      preferences: parseUserPreferences(result[0]?.preferences),
    };
  }

  public async getMe(userId: string): Promise<UserResponse> {
    const [user] = await getUserWithSelfProfile.run({ userExternalId: userId }, this.db);

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return this.mapUser(user);
  }

  public async getSelfProfileId(userId: string): Promise<string | null> {
    const result = await getUserSelfProfile.run({ userExternalId: userId }, this.db);
    return result[0]?.self_profile_external_id ?? null;
  }

  public async setSelfProfile(userId: string, friendExternalId: string): Promise<string | null> {
    const result = await setUserSelfProfile.run(
      { userExternalId: userId, friendExternalId },
      this.db,
    );

    if (result.length === 0) {
      throw new FriendNotFoundError(friendExternalId);
    }

    this.logger.info({ userId, friendId: friendExternalId }, 'Self-profile set successfully');

    return result[0]?.self_profile_external_id ?? null;
  }

  /**
   * Onboarding: create a friend for the user themselves and point
   * `self_profile_id` at it.
   */
  public async createSelfProfile(
    userId: string,
    input: FriendCreateInput,
  ): Promise<FriendResponse> {
    if ((await this.getSelfProfileId(userId)) !== null) {
      throw new ValidationError('Self-profile already exists');
    }

    const newFriend = await this.friendsService.createFriend(userId, input);

    const setResult = await setUserSelfProfile.run(
      { userExternalId: userId, friendExternalId: newFriend.id },
      this.db,
    );

    if (setResult.length === 0) {
      // The friend exists but is not marked as the self-profile: the user would
      // be stuck in onboarding with a duplicate on retry.
      throw new UserNotFoundError(userId);
    }

    this.logger.info({ userId, friendId: newFriend.id }, 'Self-profile created and set');

    return newFriend;
  }

  private mapUser(row: IGetUserWithSelfProfileResult): UserResponse {
    const selfProfileExternalId = row.self_profile_external_id;

    return {
      externalId: row.external_id,
      email: row.email,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      selfProfileId: selfProfileExternalId ?? undefined,
      displayName: row.self_profile_display_name ?? undefined,
      hasCompletedOnboarding: selfProfileExternalId !== null,
    };
  }
}
