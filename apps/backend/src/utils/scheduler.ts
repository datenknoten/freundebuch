import cron from 'node-cron';
import type pg from 'pg';
import type { Logger } from 'pino';
import { deleteExpiredAddressCacheEntries } from '../models/queries/address-cache.queries.js';
import { deleteExpiredPasswordResetTokens } from '../models/queries/password-reset-tokens.queries.js';
import { deleteExpiredSessions } from '../models/queries/sessions.queries.js';

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
      logger.error({ error }, 'Failed to clean up expired sessions');
    }

    try {
      await deleteExpiredPasswordResetTokens.run(undefined, pool);
      logger.info('Expired password reset tokens cleaned up successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to clean up expired password reset tokens');
    }

    try {
      await deleteExpiredAddressCacheEntries.run(undefined, pool);
      logger.info('Expired address cache entries cleaned up successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to clean up expired address cache entries');
    }
  });

  logger.info('Cleanup scheduler initialized - runs every hour');
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
