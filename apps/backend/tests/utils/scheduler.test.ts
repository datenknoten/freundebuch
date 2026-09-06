import type pg from 'pg';
import type { Logger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { resetConfig } from '../../src/utils/config.js';
import { setupNotificationScheduler } from '../../src/utils/scheduler.js';

/**
 * The digest dispatcher, driven through the real cron seam.
 *
 * The invariant under test is at-most-once per day: the channel is claimed
 * *before* the message is sent, so a crash between the two drops today's
 * digest rather than re-sending it on the next tick. The previous order (send,
 * then mark) treated duplicates as the retry mechanism.
 *
 * `cron.schedule` is mocked to capture the callback instead of waiting a
 * minute; nothing else about `setupNotificationScheduler` is replaced.
 * `vi.hoisted` is needed because `vi.mock` factories are hoisted above these
 * declarations and would otherwise read them in their temporal dead zone.
 */
const mocks = vi.hoisted(() => ({
  scheduled: [] as (() => Promise<void>)[],
  dispatchNotification: vi.fn(async () => undefined),
}));

vi.mock('node-cron', () => ({
  default: {
    schedule: (_expr: string, fn: () => Promise<void>) => {
      mocks.scheduled.push(fn);
      return { stop: vi.fn(), start: vi.fn() };
    },
  },
}));

vi.mock('../../src/services/external/notification-dispatcher.js', () => ({
  dispatchNotification: mocks.dispatchNotification,
}));

interface QueryResult {
  rows: Record<string, unknown>[];
}
type QueryFn = (text: string, values?: unknown[]) => Promise<QueryResult>;

function silentLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

/** One channel due right now, so the dispatcher has something to claim. */
const DUE_CHANNEL = {
  id: 1,
  external_id: '11111111-1111-4111-8111-111111111111',
  user_external_id: '22222222-2222-4222-8222-222222222222',
  platform: 'telegram',
  telegram_bot_token: 'token',
  telegram_chat_id: 'chat',
  matrix_homeserver: null,
  matrix_access_token: null,
  matrix_room_id: null,
  discord_webhook_url: null,
  lookahead_days: 14,
  user_language: 'de',
};

const UPCOMING_DATE = {
  external_id: '33333333-3333-4333-8333-333333333333',
  friend_display_name: 'Alice',
  label: 'Geburtstag',
  date_value: '2026-09-10',
  days_until: 4,
  date_month: 9,
  date_day: 10,
  year_known: false,
  friend_external_id: '44444444-4444-4444-8444-444444444444',
  friend_photo_thumbnail_url: null,
};

describe('notification dispatch', () => {
  /** SQL text in call order, so ordering assertions are possible. */
  let statements: string[];

  beforeEach(() => {
    mocks.scheduled.length = 0;
    mocks.dispatchNotification.mockClear();
    statements = [];
    resetConfig();
    vi.unstubAllEnvs();
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
  });

  afterEach(() => {
    resetConfig();
    vi.unstubAllEnvs();
  });

  /** @param claimWins whether the conditional UPDATE returns its row */
  function poolFor(claimWins: boolean): pg.Pool {
    const query: Mock<QueryFn> = vi.fn(async (text: string) => {
      statements.push(text);
      if (text.includes('UPDATE system.notification_channels')) {
        return { rows: claimWins ? [{ id: DUE_CHANNEL.id }] : [] };
      }
      if (text.includes('system.notification_channels')) {
        return { rows: [DUE_CHANNEL] };
      }
      if (text.includes('friend_dates')) {
        return { rows: [UPCOMING_DATE] };
      }
      return { rows: [] };
    });
    return { query } as unknown as pg.Pool;
  }

  async function runOneTick(pool: pg.Pool): Promise<void> {
    setupNotificationScheduler(pool, silentLogger());
    expect(mocks.scheduled).toHaveLength(1);
    await mocks.scheduled[0]();
  }

  it('claims the channel before sending, and sends when the claim wins', async () => {
    await runOneTick(poolFor(true));

    expect(mocks.dispatchNotification).toHaveBeenCalledTimes(1);

    const claimAt = statements.findIndex((sql) =>
      sql.includes('UPDATE system.notification_channels'),
    );
    const datesAt = statements.findIndex((sql) => sql.includes('friend_dates'));
    expect(claimAt).toBeGreaterThanOrEqual(0);
    // The dates query is the first thing the send path does, so the claim
    // preceding it is what "claim before send" means in call order.
    expect(claimAt).toBeLessThan(datesAt);
  });

  it('sends nothing when another tick already claimed the channel today', async () => {
    await runOneTick(poolFor(false));

    expect(mocks.dispatchNotification).not.toHaveBeenCalled();
    // It must also stop before doing the work the send would have needed.
    expect(statements.some((sql) => sql.includes('friend_dates'))).toBe(false);
  });

  it('skips a tick while the previous dispatch is still in flight', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const query: Mock<QueryFn> = vi.fn(async (text: string) => {
      statements.push(text);
      if (text.includes('system.notification_channels')) {
        await gate;
        return { rows: [] };
      }
      return { rows: [] };
    });
    const logger = silentLogger();

    setupNotificationScheduler({ query } as unknown as pg.Pool, logger);
    const first = mocks.scheduled[0]();
    // Second tick arrives while the first is blocked on the query.
    await mocks.scheduled[0]();

    expect(logger.warn).toHaveBeenCalledWith(
      'Notification dispatch still running from a previous tick, skipping',
    );

    release?.();
    await first;
  });

  it('reports a failed channel query and dispatches nothing', async () => {
    const query: Mock<QueryFn> = vi.fn(async () => {
      throw new Error('connection terminated');
    });
    const logger = silentLogger();

    setupNotificationScheduler({ query } as unknown as pg.Pool, logger);
    // A broken query must not throw out of the cron callback: an unhandled
    // rejection there would take the scheduler down for every later tick.
    await expect(mocks.scheduled[0]()).resolves.toBeUndefined();

    expect(mocks.dispatchNotification).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});
