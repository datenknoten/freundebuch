import type { DateInput, DateType, FriendDate, UpcomingDate } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  countBirthdaysForFriend,
  createDate,
  deleteDate,
  getUpcomingDates,
  type IGetDatesByFriendIdResult,
  type IGetUpcomingDatesResult,
  updateDate,
} from '../../../models/queries/friend-dates.queries.js';
import { BirthdayAlreadyExistsError } from '../../../utils/errors.js';

export interface DateServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * DateService handles all date-related operations for friends.
 * Note: This service has special logic for birthday validation and
 * does not extend SubResourceService due to its unique requirements.
 */
export class DateService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(options: DateServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Add an important date to a friend.
   * Throws BirthdayAlreadyExistsError if trying to add a second birthday.
   */
  async add(
    userExternalId: string,
    friendExternalId: string,
    data: DateInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<FriendDate | null> {
    this.logger.debug({ friendExternalId }, 'Adding date');

    const dbClient = client ?? this.db;

    // Check birthday limit (only one birthday allowed per friend)
    if (data.date_type === 'birthday') {
      const [countResult] = await countBirthdaysForFriend.run(
        { userExternalId, friendExternalId },
        dbClient as pg.Pool,
      );
      if (countResult && (countResult.count ?? 0) > 0) {
        throw new BirthdayAlreadyExistsError();
      }
    }

    const [date] = await createDate.run(
      {
        userExternalId,
        friendExternalId,
        dateValue: data.date_value,
        yearKnown: data.year_known ?? true,
        dateType: data.date_type,
        label: data.label ?? null,
      },
      dbClient as pg.Pool,
    );

    if (!date) {
      return null;
    }

    return this.mapDate(date);
  }

  /**
   * Update an existing date
   */
  async update(
    userExternalId: string,
    friendExternalId: string,
    dateExternalId: string,
    data: DateInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<FriendDate | null> {
    this.logger.debug({ friendExternalId, dateExternalId }, 'Updating date');

    const dbClient = client ?? this.db;

    const [date] = await updateDate.run(
      {
        userExternalId,
        friendExternalId,
        dateExternalId,
        dateValue: data.date_value,
        yearKnown: data.year_known ?? true,
        dateType: data.date_type,
        label: data.label ?? null,
      },
      dbClient as pg.Pool,
    );

    if (!date) {
      return null;
    }

    return this.mapDate(date);
  }

  /**
   * Delete a date
   */
  async delete(
    userExternalId: string,
    friendExternalId: string,
    dateExternalId: string,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId, dateExternalId }, 'Deleting date');

    const dbClient = client ?? this.db;

    const result = await deleteDate.run(
      { userExternalId, friendExternalId, dateExternalId },
      dbClient as pg.Pool,
    );

    return result.length > 0;
  }

  /**
   * Create multiple dates for a friend
   */
  async createMany(
    userExternalId: string,
    friendExternalId: string,
    dates: DateInput[],
    client?: pg.Pool | pg.PoolClient,
  ): Promise<FriendDate[]> {
    const results: FriendDate[] = [];

    for (const date of dates) {
      const created = await this.add(userExternalId, friendExternalId, date, client);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  /**
   * Get upcoming dates across all friends
   */
  async getUpcomingDates(
    userExternalId: string,
    options: { days?: number; limit?: number } = {},
  ): Promise<UpcomingDate[]> {
    const { days = 30, limit = 10 } = options;
    this.logger.debug({ days, limit }, 'Getting upcoming dates');

    const results = await getUpcomingDates.run(
      {
        userExternalId,
        maxDays: days,
        limitCount: limit,
      },
      this.db,
    );

    return results.map((row) => this.mapUpcomingDate(row));
  }

  /**
   * Map a date row to the FriendDate type
   */
  mapDate(row: IGetDatesByFriendIdResult): FriendDate {
    // date_value comes as a Date object from PostgreSQL
    const dateValue =
      row.date_value instanceof Date ? row.date_value.toISOString().split('T')[0] : row.date_value;
    return {
      id: row.external_id,
      dateValue,
      yearKnown: row.year_known,
      dateType: row.date_type as DateType,
      label: row.label ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Map an upcoming date row to the UpcomingDate type
   */
  private mapUpcomingDate(row: IGetUpcomingDatesResult): UpcomingDate {
    // date_value comes as a Date object from PostgreSQL
    const dateValue =
      row.date_value instanceof Date ? row.date_value.toISOString().split('T')[0] : row.date_value;
    return {
      id: row.date_external_id,
      dateValue,
      yearKnown: row.year_known,
      dateType: row.date_type as DateType,
      label: row.label ?? undefined,
      daysUntil: row.days_until ?? 0,
      friend: {
        id: row.friend_external_id,
        displayName: row.friend_display_name,
        photoThumbnailUrl: row.friend_photo_thumbnail_url ?? undefined,
      },
    };
  }
}
