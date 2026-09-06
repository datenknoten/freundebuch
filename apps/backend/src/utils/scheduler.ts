import * as Sentry from '@sentry/node';
import cron, { type ScheduledTask } from 'node-cron';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  deleteExpiredAddressCacheEntries,
} from '../models/queries/address-cache.queries.js';
import { pruneFriendChanges } from '../models/queries/friend-changes.queries.js';
import { getUpcomingDates } from '../models/queries/friend-dates.queries.js';
import {
  claimChannelForNotification,
  getEnabledChannelsDueAt,
} from '../models/queries/notification-channels.queries.js';
import { deleteOrphanLegacyUsers } from '../models/queries/users.queries.js';
import { dispatchNotification } from '../services/external/notification-dispatcher.js';
import { getConfig } from './config.js';
import { toError } from './errors.js';
import { formatNotificationMessage } from './notification-messages.js';

/**
 * Setup scheduled cleanup tasks for expired tokens and sessions
 * Runs every hour at minute 0
 */
export function setupCleanupScheduler(pool: pg.Pool, logger: Logger): ScheduledTask {
  // node-cron does not await async callbacks, so a slow run could overlap the
  // next tick. Skip a tick if the previous run is still in flight.
  let running = false;
  // Run cleanup every hour at minute 0
  // Cron expression: "0 * * * *" = at minute 0 of every hour
  const task = cron.schedule('0 * * * *', async () => {
    if (running) {
      logger.warn('Cleanup still running from a previous tick, skipping');
      return;
    }
    running = true;
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
      running = false;
    }
  });

  logger.info('Cleanup scheduler initialized - runs every hour');
  return task;
}

/**
 * Setup notification scheduler for daily date digest messages
 * Runs every minute to check for channels due for notification
 */
export function setupNotificationScheduler(pool: pg.Pool, logger: Logger): ScheduledTask {
  // Skip a tick if the previous dispatch run is still in flight. Without this,
  // a run taking >60s overlaps the next and could double-send a digest.
  let running = false;
  const task = cron.schedule('* * * * *', async () => {
    if (running) {
      logger.warn('Notification dispatch still running from a previous tick, skipping');
      return;
    }
    running = true;
    try {
      await dispatchDueNotifications(pool, logger);
    } finally {
      running = false;
    }
  });

  logger.info('Notification scheduler initialized - runs every minute');
  return task;
}

/**
 * Query and dispatch all notification channels due at the current minute.
 * Extracted so the overlap guard in setupNotificationScheduler stays readable.
 */
async function dispatchDueNotifications(pool: pg.Pool, logger: Logger): Promise<void> {
  const now = new Date();
  const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  const todayUtc = now.toISOString().slice(0, 10);

  let dueChannels: Awaited<ReturnType<typeof getEnabledChannelsDueAt.run>>;
  try {
    dueChannels = await getEnabledChannelsDueAt.run(
      { notifyTime: currentTime, today: todayUtc },
      pool,
    );
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to query due notification channels');
    Sentry.captureException(err);
    return;
  }

  if (dueChannels.length === 0) return;

  const config = getConfig();
  const instanceUrl =
    config.FRONTEND_URL !== 'http://localhost:5173' ? config.FRONTEND_URL : undefined;

  for (const channel of dueChannels) {
    try {
      // Claim the channel *before* sending. The claim sets last_notified_date,
      // so a crash, restart or deploy between claim and send drops today's
      // digest instead of re-sending it on the next tick: the digest is a
      // daily convenience and a duplicate message is worse than a miss.
      const claimed = await claimChannelForNotification.run(
        { channelId: channel.id, today: todayUtc },
        pool,
      );
      if (claimed.length === 0) {
        // Another tick already claimed this channel for today.
        continue;
      }

      const upcomingDates = await getUpcomingDates.run(
        {
          userExternalId: channel.user_external_id,
          maxDays: channel.lookahead_days,
          limitCount: 50,
        },
        pool,
      );

      if (upcomingDates.length === 0) {
        // Nothing to send today; the claim keeps us from re-checking every minute.
        continue;
      }

      const locale = channel.user_language ?? 'en';
      const message = formatNotificationMessage(upcomingDates, locale, instanceUrl);
      await dispatchNotification(channel, message.plain, message.html);

      logger.info({ channelExternalId: channel.external_id }, 'Notification dispatched');
    } catch (error) {
      const err = toError(error);
      logger.error(
        { err, channelExternalId: channel.external_id },
        'Failed to dispatch notification',
      );
      Sentry.captureException(err);
      // The claim stays in place: today's digest is lost and the channel is
      // picked up again tomorrow. At-most-once beats re-sending a digest the
      // user may already have received.
    }
  }
}

/**
 * Run cleanup immediately (useful for testing or manual trigger)
 */
export async function runCleanupNow(pool: pg.Pool, logger: Logger): Promise<void> {
  logger.info('Running immediate cleanup of orphan identity rows and expired cache');

  try {
    await deleteOrphanLegacyUsers.run(undefined, pool);
    await deleteExpiredAddressCacheEntries.run(undefined, pool);
    await pruneFriendChanges.run(undefined, pool);
    logger.info('Immediate cleanup completed');
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Immediate cleanup failed');
    Sentry.captureException(err);
    throw err;
  }
}
