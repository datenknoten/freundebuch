import * as Sentry from '@sentry/node';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  deleteExpiredAddressCacheEntries,
  trimAddressCache,
} from '../models/queries/address-cache.queries.js';
import { pruneFriendChanges } from '../models/queries/friend-changes.queries.js';
import { deleteOrphanLegacyUsers } from '../models/queries/users.queries.js';
import { toError } from './to-error.js';

export async function runCleanupNow(pool: pg.Pool, logger: Logger) {
  logger.info('Running immediate cleanup of orphan identity rows and expired cache');

  try {
    await deleteOrphanLegacyUsers.run(undefined, pool);
    await deleteExpiredAddressCacheEntries.run(undefined, pool);
    await trimAddressCache.run(undefined, pool);
    await pruneFriendChanges.run(undefined, pool);
    logger.info('Immediate cleanup completed');
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Immediate cleanup failed');
    Sentry.captureException(err);
    throw err;
  }
}
