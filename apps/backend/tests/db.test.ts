import pg from 'pg';
import { pino } from 'pino';
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { checkDatabaseConnection } from '../src/utils/check-database-connection.js';
import { closePool } from '../src/utils/close-pool.js';
import { createPool } from '../src/utils/create-pool.js';
import { setupGracefulShutdown } from '../src/utils/setup-graceful-shutdown.js';
import { wrapClient } from '../src/utils/wrap-client.js';
import { TEST_ENV } from './helpers/test-env.js';

vi.mock('pg', () => ({ default: { Pool: vi.fn(poolReturning(undefined)) } }));

const SILENT_LOGGER = pino({ level: 'silent' });

/** A constructor mock must be a `function`: `new` on an arrow throws. */
function poolReturning(instance: object | undefined) {
  return function FakePool() {
    return instance;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createPool', () => {
  it('passes the connection string, pool bounds and timeouts to pg', () => {
    const mockPoolInstance = {
      connect: vi.fn(),
      query: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    };

    // @ts-expect-error - the fake pool only has the methods createPool touches
    pg.Pool.mockImplementation(poolReturning(mockPoolInstance));

    const pool = createPool({ config: loadConfig({ ...TEST_ENV }), logger: SILENT_LOGGER });

    expect(pg.Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://localhost:5432/test',
      min: 2,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
      query_timeout: 30000,
    });
    expect(pool).toBe(mockPoolInstance);
  });

  it('uses the configured pool bounds', () => {
    const config = loadConfig({ ...TEST_ENV, DATABASE_POOL_MIN: '5', DATABASE_POOL_MAX: '20' });

    const mockPoolInstance = {
      connect: vi.fn(),
      query: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    };

    // @ts-expect-error - the fake pool only has the methods createPool touches
    pg.Pool.mockImplementation(poolReturning(mockPoolInstance));

    createPool({ config, logger: SILENT_LOGGER });

    expect(pg.Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://localhost:5432/test',
      min: 5,
      max: 20,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
      query_timeout: 30000,
    });
  });
});

describe('wrapClient', () => {
  it('wraps the client query exactly once across repeated checkouts', async () => {
    // Pooled clients are reused: the pool calls wrapClient on the same
    // physical client object every time it's checked out. Re-wrapping would
    // nest the query wrapper one level deeper each time until invoking
    // client.query overflows the call stack. Wrapping must be idempotent.
    const realQuery = vi.fn().mockResolvedValue({ rows: [] });
    // A fake carrying only the methods the function under test calls.
    const client = { query: realQuery } as unknown as pg.PoolClient;

    const first = wrapClient(client);
    const wrappedQuery = first.query;
    expect(wrappedQuery).not.toBe(realQuery);

    // Simulate many subsequent checkouts of the same pooled client.
    for (let i = 0; i < 50; i++) {
      const again = wrapClient(client);
      expect(again).toBe(client);
      // The query reference must stay stable — no additional wrapper layers.
      expect(again.query).toBe(wrappedQuery);
    }

    // The wrapper still delegates to the original query exactly once.
    await client.query('SELECT 1');
    expect(realQuery).toHaveBeenCalledTimes(1);
    expect(realQuery).toHaveBeenCalledWith('SELECT 1');
  });

  it('enhances the rejection with the call-site stack trace', async () => {
    const dbError = new Error('boom');
    const realQuery = vi.fn().mockRejectedValue(dbError);
    // A fake carrying only the methods the function under test calls.
    const client = { query: realQuery } as unknown as pg.PoolClient;

    wrapClient(client);

    let rejection: unknown;
    try {
      await client.query('SELECT 1');
    } catch (error) {
      rejection = error;
    }
    assert(rejection instanceof Error, 'expected query to reject');

    // The original DB error is preserved...
    expect(rejection.message).toBe('boom');
    // ...and the wrapper appended the call-site marker. Asserting only the
    // message would still pass if enhanceErrorWithStack regressed.
    expect(rejection.stack).toContain('--- Query initiated from ---');
    // The appended section must carry real call-site frames, not just the marker.
    const [, callSite = ''] = (rejection.stack ?? '').split('--- Query initiated from ---');
    expect(callSite).toMatch(/\bat\b/);
  });
});

describe('checkDatabaseConnection', () => {
  it('reports true when SELECT 1 succeeds', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };

    // A fake carrying only the methods the function under test calls.

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    } as unknown as pg.Pool;

    const result = await checkDatabaseConnection(mockPool, SILENT_LOGGER);

    expect(result).toBe(true);
    expect(mockPool.connect).toHaveBeenCalledOnce();
    expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
    expect(mockClient.release).toHaveBeenCalledOnce();
  });

  it('reports false when the pool cannot connect', async () => {
    // A fake carrying only the methods the function under test calls.
    const mockPool = {
      connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
    } as unknown as pg.Pool;

    const result = await checkDatabaseConnection(mockPool, SILENT_LOGGER);

    expect(result).toBe(false);
    expect(mockPool.connect).toHaveBeenCalledOnce();
  });

  it('reports false when SELECT 1 fails', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('Query failed')),
      release: vi.fn(),
    };

    // A fake carrying only the methods the function under test calls.

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    } as unknown as pg.Pool;

    const result = await checkDatabaseConnection(mockPool, SILENT_LOGGER);

    expect(result).toBe(false);
    expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('releases the client even when the query fails', async () => {
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('Query failed')),
      release: vi.fn(),
    };

    // A fake carrying only the methods the function under test calls.

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    } as unknown as pg.Pool;

    await checkDatabaseConnection(mockPool, SILENT_LOGGER);

    // Client must still be released on error (released in a finally block).
    expect(mockClient.release).toHaveBeenCalledOnce();
  });
});

describe('closePool', () => {
  it('ends the pool', async () => {
    // A fake carrying only the methods the function under test calls.
    const mockPool = {
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as pg.Pool;

    await closePool(mockPool);

    expect(mockPool.end).toHaveBeenCalledOnce();
  });

  it('propagates a failure from pool.end', async () => {
    // A fake carrying only the methods the function under test calls.
    const mockPool = {
      end: vi.fn().mockRejectedValue(new Error('End failed')),
    } as unknown as pg.Pool;

    await expect(closePool(mockPool)).rejects.toThrow('End failed');
  });
});

describe('setupGracefulShutdown', () => {
  let mockPool: pg.Pool;

  beforeEach(() => {
    // A fake carrying only the methods the function under test calls.
    mockPool = {
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as pg.Pool;

    // Clean up existing listeners
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  it('registers one SIGTERM and one SIGINT handler', () => {
    setupGracefulShutdown({ pool: mockPool, logger: SILENT_LOGGER });

    expect(process.listenerCount('SIGTERM')).toBe(1);
    expect(process.listenerCount('SIGINT')).toBe(1);
  });
});
