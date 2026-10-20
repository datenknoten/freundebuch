import * as Sentry from '@sentry/node';
import cron, { type ScheduledTask } from 'node-cron';
import type pg from 'pg';
import type { Logger } from 'pino';
import type { Config } from '../config.js';
import { getUpcomingDates } from '../models/queries/friend-dates.queries.js';
import {
  claimChannelForNotification,
  getEnabledChannelsDueAt,
} from '../models/queries/notification-channels.queries.js';
import { dispatchNotification } from '../services/external/notification-dispatcher.js';
import { formatNotificationMessage } from './notification-messages.js';
import { toError } from './to-error.js';

export interface NotificationSchedulerOptions {
  pool: pg.Pool;
  logger: Logger;
  /** From deriveCredentialsKey(config.BETTER_AUTH_SECRET). */
  credentialsKey: Buffer;
  config: Pick<Config, 'FRONTEND_URL'>;
}

/**
 * Setup notification scheduler for daily date digest messages
 * Runs every minute to check for channels due for notification
 */
export function setupNotificationScheduler(options: NotificationSchedulerOptions): ScheduledTask {
  const { logger } = options;
  // Skip a tick if the previous dispatch run is still in flight. Without this,
  // a run taking >60s overlaps the next and could double-send a digest.
  let isRunning = false;
  const task = cron.schedule('* * * * *', async () => {
    if (isRunning) {
      logger.warn('Notification dispatch still running from a previous tick, skipping');
      return;
    }
    isRunning = true;
    try {
      await dispatchDueNotifications(options);
    } finally {
      isRunning = false;
    }
  });

  logger.info('Notification scheduler initialized - runs every minute');
  return task;
}

/**
 * Query and dispatch all notification channels due at the current minute.
 * Extracted so the overlap guard in setupNotificationScheduler stays readable.
 */
async function dispatchDueNotifications(options: NotificationSchedulerOptions): Promise<void> {
  const { pool, logger, credentialsKey, config } = options;
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
      await dispatchNotification(channel, message.plain, message.html, credentialsKey);

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
