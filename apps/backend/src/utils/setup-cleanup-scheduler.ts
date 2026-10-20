import * as Sentry from '@sentry/node';
import cron, { type ScheduledTask } from 'node-cron';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  deleteExpiredAddressCacheEntries,
  trimAddressCache,
} from '../models/queries/address-cache.queries.js';
import { pruneFriendChanges } from '../models/queries/friend-changes.queries.js';
import { deleteOrphanLegacyUsers } from '../models/queries/users.queries.js';
import { toError } from './to-error.js';

/**
 * Setup scheduled cleanup tasks for expired tokens and sessions
 * Runs every hour at minute 0
 */
export function setupCleanupScheduler(pool: pg.Pool, logger: Logger): ScheduledTask {
  // node-cron does not await async callbacks, so a slow run could overlap the
  // next tick. Skip a tick if the previous run is still in flight.
  let isRunning = false;
  // Run cleanup every hour at minute 0
  // Cron expression: "0 * * * *" = at minute 0 of every hour
  const task = cron.schedule('0 * * * *', async () => {
    if (isRunning) {
      logger.warn('Cleanup still running from a previous tick, skipping');
      return;
    }
    isRunning = true;
    logger.info('Running scheduled cleanup of orphan identity rows and expired cache');

    try {
      // Sign-ups allocate the legacy auth.users row before the Better Auth
      // transaction commits, so a failure can leave one behind.
      const [result] = await deleteOrphanLegacyUsers.run(undefined, pool);
      logger.info({ deleted: result?.deleted_count ?? 0 }, 'Orphan legacy user rows cleaned up');
    } catch (error) {
      const err = toError(error);
      logger.error({ err }, 'Failed to clean up orphan legacy user rows');
      Sentry.captureException(err);
    }

    try {
      await deleteExpiredAddressCacheEntries.run(undefined, pool);
      logger.info('Expired address cache entries cleaned up successfully');
    } catch (error) {
      const err = toError(error);
      logger.error({ err }, 'Failed to clean up expired address cache entries');
      Sentry.captureException(err);
    }

    try {
      // Unexpired entries still need a ceiling: the geocoder cache is a
      // convenience, so keep the newest 50k keys and drop the rest.
      await trimAddressCache.run(undefined, pool);
      logger.info('Address cache trimmed to its size bound');
    } catch (error) {
      const err = toError(error);
      logger.error({ err }, 'Failed to trim the address cache');
      Sentry.captureException(err);
    }

    try {
      await pruneFriendChanges.run(undefined, pool);
      logger.info('Friend change log pruned successfully');
    } catch (error) {
      const err = toError(error);
      logger.error({ err }, 'Failed to prune the friend change log');
      Sentry.captureException(err);
    } finally {
      isRunning = false;
    }
  });

  logger.info('Cleanup scheduler initialized - runs every hour');
  return task;
}
