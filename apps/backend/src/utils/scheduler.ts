import * as Sentry from '@sentry/node';
import cron from 'node-cron';
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
import { dispatchNotification } from '../services/external/notification-dispatcher.js';
import { getConfig } from './config.js';
import { toError } from './errors.js';
import { formatNotificationMessage } from './notification-messages.js';

/**
 * Setup scheduled cleanup tasks for expired tokens and sessions
 * Runs every hour at minute 0
 */
export function setupCleanupScheduler(pool: pg.Pool, logger: Logger): void {
  // Run cleanup every hour at minute 0
  // Cron expression: "0 * * * *" = at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
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
    }
  });

  logger.info('Cleanup scheduler initialized - runs every hour');
}

/**
 * Setup notification scheduler for daily date digest messages
 * Runs every minute to check for channels due for notification
 */
export function setupNotificationScheduler(pool: pg.Pool, logger: Logger): void {
  cron.schedule('* * * * *', async () => {
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
  });

  logger.info('Notification scheduler initialized - runs every minute');
}

/**
 * Run cleanup immediately (useful for testing or manual trigger)
 */
export async function runCleanupNow(pool: pg.Pool, logger: Logger): Promise<void> {
  logger.info('Running immediate cleanup of expired sessions, tokens, and cache');

  await deleteExpiredSessions.run(undefined, pool);
  await deleteExpiredPasswordResetTokens.run(undefined, pool);
  await deleteExpiredAddressCacheEntries.run(undefined, pool);

  logger.info('Immediate cleanup completed');
}
