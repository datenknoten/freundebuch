import type {
  DateType,
  FriendDateResponse,
  UpcomingDateResponse,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { BirthdayAlreadyExistsError } from '../../../errors/birthday-already-exists.error.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import { ResourceNotFoundError } from '../../../errors/resource-not-found.error.js';
import {
  countBirthdaysForFriend,
  createDate,
  deleteDate,
  getDatesByFriendId,
  getUpcomingDates,
  type IGetDatesByFriendIdResult,
  type IGetUpcomingDatesResult,
  updateDate,
} from '../../../models/queries/friend-dates.queries.js';
import { formatDateOnly } from '../../../utils/date.js';
import { parseDateType } from '../../../utils/parse-date-type.js';

export interface DateData {
  dateValue: string;
  yearKnown: boolean;
  dateType: DateType;
  label?: string;
}

export interface DateServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/** Not a SubResourceService: a friend may hold only one birthday. */
export class DateService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;

  constructor(options: DateServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  public async list(userExternalId: string, friendExternalId: string) {
    this.logger.debug({ friendExternalId }, 'Listing dates');
    const rows = await getDatesByFriendId.run({ userExternalId, friendExternalId }, this.db);
    return rows.map((row) => this.mapDate(row));
  }

  /** @throws {BirthdayAlreadyExistsError} when the friend already has a birthday. */
  public async add(userExternalId: string, friendExternalId: string, data: DateData) {
    const created = await this.insert(this.db, userExternalId, friendExternalId, data);
    if (created === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }
    return created;
  }

  public async update(
    userExternalId: string,
    friendExternalId: string,
    dateExternalId: string,
    data: DateData,
  ) {
    this.logger.debug({ friendExternalId, dateExternalId }, 'Updating date');

    const [date] = await updateDate.run(
      {
        userExternalId,
        friendExternalId,
        dateExternalId,
        dateValue: data.dateValue,
        yearKnown: data.yearKnown,
        dateType: data.dateType,
        label: data.label ?? null,
      },
      this.db,
    );
    if (date === undefined) {
      throw new ResourceNotFoundError('Date', dateExternalId);
    }
    return this.mapDate(date);
  }

  public async delete(userExternalId: string, friendExternalId: string, dateExternalId: string) {
    this.logger.debug({ friendExternalId, dateExternalId }, 'Deleting date');

    const deleted = await deleteDate.run(
      { userExternalId, friendExternalId, dateExternalId },
      this.db,
    );
    if (deleted.length === 0) {
      throw new ResourceNotFoundError('Date', dateExternalId);
    }
  }

  /**
   * Runs on the caller's transaction: friend creation writes the friend row and
   * all its dates atomically.
   */
  public async createMany(
    userExternalId: string,
    friendExternalId: string,
    dates: DateData[],
    client?: pg.Pool | pg.PoolClient,
  ) {
    const results: FriendDateResponse[] = [];

    for (const date of dates) {
      const created = await this.insert(client ?? this.db, userExternalId, friendExternalId, date);
      if (created !== undefined) {
        results.push(created);
      }
    }

    return results;
  }

  public async getUpcomingDates(
    userExternalId: string,
    options: { days?: number; limit?: number } = {},
  ) {
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

  /** Insert a date; `undefined` when the friend is not the user's. */
  private async insert(
    client: pg.Pool | pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    data: DateData,
  ) {
    this.logger.debug({ friendExternalId }, 'Adding date');

    if (data.dateType === 'birthday') {
      const [countResult] = await countBirthdaysForFriend.run(
        { userExternalId, friendExternalId },
        client,
      );
      if (countResult !== undefined && (countResult.count ?? 0) > 0) {
        throw new BirthdayAlreadyExistsError();
      }
    }

    const [date] = await createDate.run(
      {
        userExternalId,
        friendExternalId,
        dateValue: data.dateValue,
        yearKnown: data.yearKnown,
        dateType: data.dateType,
        label: data.label ?? null,
      },
      client,
    );
    if (date === undefined) {
      return undefined;
    }
    return this.mapDate(date);
  }

  public mapDate(row: IGetDatesByFriendIdResult) {
    const dateValue = formatDateOnly(row.date_value);
    return {
      id: row.external_id,
      dateValue,
      yearKnown: row.year_known,
      dateType: parseDateType(row.date_type),
      label: row.label ?? undefined,
      createdAt: row.created_at.toISOString(),
    } satisfies FriendDateResponse;
  }

  private mapUpcomingDate(row: IGetUpcomingDatesResult) {
    const dateValue = formatDateOnly(row.date_value);
    return {
      id: row.date_external_id,
      dateValue,
      yearKnown: row.year_known,
      dateType: parseDateType(row.date_type),
      label: row.label ?? undefined,
      daysUntil: row.days_until ?? 0,
      friend: {
        id: row.friend_external_id,
        displayName: row.friend_display_name,
        photoThumbnailUrl: row.friend_photo_thumbnail_url ?? undefined,
      },
    } satisfies UpcomingDateResponse;
  }
}
