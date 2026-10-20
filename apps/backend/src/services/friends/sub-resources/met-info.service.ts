import type { MetInfoResponse } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import { ResourceNotFoundError } from '../../../errors/resource-not-found.error.js';
import {
  deleteMetInfo,
  type IGetMetInfoByFriendIdResult,
  upsertMetInfo,
} from '../../../models/queries/friend-met-info.queries.js';
import { formatDateOnly } from '../../../utils/date.js';

export interface MetInfoData {
  metDate?: string | null;
  metLocation?: string | null;
  metContext?: string | null;
}

export interface MetInfoServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/** Not a SubResourceService: a friend holds at most one met-info row, written by upsert. */
export class MetInfoService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;

  constructor(options: MetInfoServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  public async set(
    userExternalId: string,
    friendExternalId: string,
    data: MetInfoData,
    client?: pg.Pool | pg.PoolClient,
  ) {
    this.logger.debug({ friendExternalId }, 'Setting met info');

    const [metInfo] = await upsertMetInfo.run(
      {
        userExternalId,
        friendExternalId,
        metDate: data.metDate ?? null,
        metLocation: data.metLocation ?? null,
        metContext: data.metContext ?? null,
      },
      client ?? this.db,
    );
    if (metInfo === undefined) {
      throw new FriendNotFoundError(friendExternalId);
    }
    return this.mapMetInfo(metInfo);
  }

  public async delete(userExternalId: string, friendExternalId: string) {
    this.logger.debug({ friendExternalId }, 'Deleting met info');

    const deleted = await deleteMetInfo.run({ userExternalId, friendExternalId }, this.db);
    if (deleted.length === 0) {
      throw new ResourceNotFoundError('Met info', friendExternalId);
    }
  }

  public mapMetInfo(row: IGetMetInfoByFriendIdResult) {
    const metDate = formatDateOnly(row.met_date);
    return {
      id: row.external_id,
      metDate,
      metLocation: row.met_location ?? undefined,
      metContext: row.met_context ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    } satisfies MetInfoResponse;
  }
}
