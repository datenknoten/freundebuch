import { ValidationError } from '@datenknoten/kit';
import type { FriendCreateInput, FriendResponse, UserResponse } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { FriendNotFoundError } from '../errors/friend-not-found.error.js';
import { UserNotFoundError } from '../errors/user-not-found.error.js';
import {
  getUserSelfProfile,
  getUserWithSelfProfile,
  type IGetUserWithSelfProfileResult,
  setUserSelfProfile,
} from '../models/queries/users.queries.js';
import type { FriendsService } from './friends/index.js';

export interface UsersServiceOptions {
  db: pg.Pool;
  logger: Logger;
  friendsService: FriendsService;
}

/**
 * Reads and writes the current user's own record and self-profile.
 *
 * These four operations were inline in `routes/users.ts`, which meant the
 * `User` DTO was assembled in three places and one path threw a raw `Error`.
 */
export class UsersService {
  private db: pg.Pool;
  private logger: Logger;
  private readonly friendsService: FriendsService;

  constructor(options: UsersServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
    this.friendsService = options.friendsService;
  }

  async getMe(userId: string): Promise<UserResponse> {
    const [user] = await getUserWithSelfProfile.run({ userExternalId: userId }, this.db);

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return this.mapUser(user);
  }

  async getSelfProfileId(userId: string): Promise<string | null> {
    const result = await getUserSelfProfile.run({ userExternalId: userId }, this.db);
    return result[0]?.self_profile_external_id ?? null;
  }

  async setSelfProfile(userId: string, friendExternalId: string): Promise<string | null> {
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
  async createSelfProfile(userId: string, input: FriendCreateInput): Promise<FriendResponse> {
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
