import type { MetInfo, MetInfoInput } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  deleteMetInfo,
  type IGetMetInfoByFriendIdResult,
  upsertMetInfo,
} from '../../../models/queries/friend-met-info.queries.js';

export interface MetInfoServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * MetInfoService handles met information operations for friends.
 * Note: This service uses upsert semantics (not standard CRUD) and
 * does not extend SubResourceService due to its unique requirements.
 */
export class MetInfoService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(options: MetInfoServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Set or update met information for a friend (upsert semantics)
   */
  async set(
    userExternalId: string,
    friendExternalId: string,
    data: MetInfoInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<MetInfo | null> {
    this.logger.debug({ friendExternalId }, 'Setting met info');

    const dbClient = client ?? this.db;

    const [metInfo] = await upsertMetInfo.run(
      {
        userExternalId,
        friendExternalId,
        metDate: data.met_date ?? null,
        metLocation: data.met_location ?? null,
        metContext: data.met_context ?? null,
      },
      dbClient as pg.Pool,
    );

    if (!metInfo) {
      return null;
    }

    return this.mapMetInfo(metInfo);
  }

  /**
   * Delete met information for a friend
   */
  async delete(
    userExternalId: string,
    friendExternalId: string,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<boolean> {
    this.logger.debug({ friendExternalId }, 'Deleting met info');

    const dbClient = client ?? this.db;

    const result = await deleteMetInfo.run(
      { userExternalId, friendExternalId },
      dbClient as pg.Pool,
    );

    return result.length > 0;
  }

  /**
   * Map a met info row to the MetInfo type
   */
  mapMetInfo(row: IGetMetInfoByFriendIdResult): MetInfo {
    // met_date comes as a Date object from PostgreSQL
    const metDate =
      row.met_date instanceof Date
        ? row.met_date.toISOString().split('T')[0]
        : (row.met_date ?? undefined);
    return {
      id: row.external_id,
      metDate,
      metLocation: row.met_location ?? undefined,
      metContext: row.met_context ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
