import * as Sentry from '@sentry/node';
import cron, { type ScheduledTask } from 'node-cron';
import type pg from 'pg';
import type { Logger } from 'pino';
import { deleteExpiredAddressCacheEntries } from '../models/queries/address-cache.queries.js';
import { getUpcomingDates } from '../models/queries/friend-dates.queries.js';
import {
  getEnabledChannelsDueAt,
  markChannelNotified,
} from '../models/queries/notification-channels.queries.js';
// Note: Session and password reset token cleanup is now handled by Better Auth.
// Legacy table cleanup is kept during the transition period.
import { deleteExpiredPasswordResetTokens } from '../models/queries/password-reset-tokens.queries.js';
import { deleteExpiredSessions } from '../models/queries/sessions.queries.js';
import { DataQualityService } from '../services/data-quality/index.js';
import { dispatchNotification } from '../services/external/notification-dispatcher.js';
import { getConfig } from './config.js';
import { formatDateOnly } from './date.js';
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
    logger.info('Running scheduled cleanup of expired sessions, tokens, and cache');

    try {
      await deleteExpiredSessions.run(undefined, pool);
      logger.info('Expired sessions cleaned up successfully');
    } catch (error) {
      const err = toError(error);
      logger.error({ err }, 'Failed to clean up expired sessions');
      Sentry.captureException(err);
    }

    try {
      await deleteExpiredPasswordResetTokens.run(undefined, pool);
      logger.info('Expired password reset tokens cleaned up successfully');
    } catch (error) {
      const err = toError(error);
      logger.error({ err }, 'Failed to clean up expired password reset tokens');
      Sentry.captureException(err);
    }

    try {
      await deleteExpiredAddressCacheEntries.run(undefined, pool);
      logger.info('Expired address cache entries cleaned up successfully');
    } catch (error) {
      const err = toError(error);
      logger.error({ err }, 'Failed to clean up expired address cache entries');
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
 * Setup the nightly data-quality index snapshot.
 * Runs at 03:15 so it lands after the hourly cleanup and well outside peak use.
 */
export function setupDataQualityIndexScheduler(pool: pg.Pool, logger: Logger): ScheduledTask {
  // node-cron does not await async callbacks; a slow run must not overlap.
  let running = false;
  const task = cron.schedule('15 3 * * *', async () => {
    if (running) {
      logger.warn('Data-quality snapshot still running from a previous tick, skipping');
      return;
    }
    running = true;
    try {
      await snapshotDataQualityIndex(pool, logger);
    } finally {
      running = false;
    }
  });

  logger.info('Data-quality index scheduler initialized - runs nightly at 03:15');
  return task;
}

/**
 * Write one data-quality index value per user for today.
 *
 * Idempotent: the upsert is keyed on (user_id, snapshot_date). A single user's
 * failure must not abort the tick, so each is isolated.
 */
async function snapshotDataQualityIndex(pool: pg.Pool, logger: Logger): Promise<void> {
  const service = new DataQualityService({ db: pool, logger });
  const today = formatDateOnly(new Date());

  let userExternalIds: string[];
  try {
    userExternalIds = await service.listUserExternalIds();
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Failed to list users for the data-quality snapshot');
    Sentry.captureException(err);
    return;
  }

  for (const userExternalId of userExternalIds) {
    try {
      const value = await service.snapshotIndexForUser(userExternalId, today);
      logger.debug({ userExternalId, value }, 'Data-quality index snapshot written');
    } catch (error) {
      const err = toError(error);
      logger.error({ err, userExternalId }, 'Failed to snapshot the data-quality index');
      Sentry.captureException(err);
    }
  }

  logger.info({ userCount: userExternalIds.length }, 'Data-quality index snapshot completed');
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
      const upcomingDates = await getUpcomingDates.run(
        {
          userExternalId: channel.user_external_id,
          maxDays: channel.lookahead_days,
          limitCount: 50,
        },
        pool,
      );

      if (upcomingDates.length === 0) {
        // No upcoming dates — mark as notified so we don't re-check every minute
        await markChannelNotified.run({ channelId: channel.id, today: todayUtc }, pool);
        continue;
      }

      const locale = channel.user_language ?? 'en';
      const message = formatNotificationMessage(upcomingDates, locale, instanceUrl);
      await dispatchNotification(channel, message.plain, message.html);

      await markChannelNotified.run({ channelId: channel.id, today: todayUtc }, pool);
      logger.info({ channelExternalId: channel.external_id }, 'Notification dispatched');
    } catch (error) {
      const err = toError(error);
      logger.error(
        { err, channelExternalId: channel.external_id },
        'Failed to dispatch notification',
      );
      Sentry.captureException(err);
      // last_notified_date is NOT updated on failure, so the channel will be retried next minute
    }
  }
}

/**
 * Run cleanup immediately (useful for testing or manual trigger)
 */
export async function runCleanupNow(pool: pg.Pool, logger: Logger): Promise<void> {
  logger.info('Running immediate cleanup of expired sessions, tokens, and cache');

  try {
    await deleteExpiredSessions.run(undefined, pool);
    await deleteExpiredPasswordResetTokens.run(undefined, pool);
    await deleteExpiredAddressCacheEntries.run(undefined, pool);
    logger.info('Immediate cleanup completed');
  } catch (error) {
    const err = toError(error);
    logger.error({ err }, 'Immediate cleanup failed');
    Sentry.captureException(err);
    throw err;
  }
}

/**
 * Run the data-quality index snapshot immediately (manual trigger / testing).
 */
export async function runDataQualitySnapshotNow(pool: pg.Pool, logger: Logger): Promise<void> {
  logger.info('Running immediate data-quality index snapshot');
  await snapshotDataQualityIndex(pool, logger);
}
