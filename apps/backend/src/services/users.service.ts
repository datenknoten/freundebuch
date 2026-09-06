import type { Friend, FriendCreateInput, User } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  getUserSelfProfile,
  getUserWithSelfProfile,
  type IGetUserWithSelfProfileResult,
  setUserSelfProfile,
} from '../models/queries/users.queries.js';
import { UserNotFoundError, ValidationError } from '../utils/errors.js';
import { FriendsService } from './friends/index.js';

export interface UsersServiceOptions {
  db: pg.Pool;
  logger: Logger;
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

  constructor(options: UsersServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  async getMe(userId: string): Promise<User> {
    const [user] = await getUserWithSelfProfile.run({ userExternalId: userId }, this.db);

    if (!user) {
      throw new UserNotFoundError();
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
      throw new UserNotFoundError('Friend not found or does not belong to user');
    }

    this.logger.info({ userId, friendId: friendExternalId }, 'Self-profile set successfully');

    return result[0]?.self_profile_external_id ?? null;
  }

  /**
   * Onboarding: create a friend for the user themselves and point
   * `self_profile_id` at it.
   */
  async createSelfProfile(userId: string, input: FriendCreateInput): Promise<Friend> {
    if ((await this.getSelfProfileId(userId)) !== null) {
      throw new ValidationError('Self-profile already exists');
    }

    const friendsService = new FriendsService(this.db, this.logger);
    const newFriend = await friendsService.createFriend(userId, input);

    const setResult = await setUserSelfProfile.run(
      { userExternalId: userId, friendExternalId: newFriend.id },
      this.db,
    );

    if (setResult.length === 0) {
      // The friend exists but is not marked as the self-profile: the user would
      // be stuck in onboarding with a duplicate on retry.
      throw new UserNotFoundError('Failed to set self-profile after creation');
    }

    this.logger.info({ userId, friendId: newFriend.id }, 'Self-profile created and set');

    return newFriend;
  }

  private mapUser(row: IGetUserWithSelfProfileResult): User {
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
