import type pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { AddressCache, getStreetsCache } from '../../src/utils/cache.js';
import { resetConfig } from '../../src/utils/config.js';

interface QueryResult {
  rows: Record<string, unknown>[];
}

type QueryFn = (text: string, values?: unknown[]) => Promise<QueryResult>;

interface PoolStub {
  pool: pg.Pool;
  query: Mock<QueryFn>;
}

function mockPool(handler: QueryFn): PoolStub {
  const query = vi.fn(handler);
  return { pool: { query } as unknown as pg.Pool, query };
}

/** The statements a PreparedQuery handed to pg, in call order. */
function statements(query: Mock<QueryFn>): string[] {
  return query.mock.calls.map((call) => call[0]);
}

describe('AddressCache database tier', () => {
  beforeEach(() => {
    resetConfig();
    vi.unstubAllEnvs();
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
  });

  afterEach(() => {
    resetConfig();
    vi.unstubAllEnvs();
  });

  it('persists to and probes the database tier when PostGIS is off', async () => {
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'false');
    const { pool, query } = mockPool(async (text) =>
      text.includes('SELECT 1') ? { rows: [{ present: 1 }] } : { rows: [] },
    );
    const cache = getStreetsCache();
    cache.setPool(pool);

    await cache.set('streets:off:1', [{ name: 'Hauptstrasse' }]);
    expect(statements(query).some((sql) => sql.includes('INSERT INTO system.address_cache'))).toBe(
      true,
    );

    // Absent from memory, present in the database tier.
    await expect(cache.has('streets:off:only-in-db')).resolves.toBe(true);
    expect(statements(query).some((sql) => sql.includes('SELECT 1 AS present'))).toBe(true);
  });

  it('skips the database tier entirely when PostGIS is enabled', async () => {
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'true');
    const { pool, query } = mockPool(async () => ({ rows: [{ present: 1 }] }));
    const cache = getStreetsCache();
    cache.setPool(pool);

    await cache.set('streets:on:1', [{ name: 'Hauptstrasse' }]);
    await expect(cache.get('streets:on:unknown')).resolves.toBeUndefined();
    await expect(cache.has('streets:on:unknown')).resolves.toBe(false);

    expect(query).not.toHaveBeenCalled();
    // The memory tier is unaffected.
    await expect(cache.get('streets:on:1')).resolves.toEqual([{ name: 'Hauptstrasse' }]);
  });

  it('treats a malformed cached row as a miss and deletes it', async () => {
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'false');
    const { pool, query } = mockPool(async (text) =>
      text.includes('SELECT cache_key') ? { rows: [{ cache_value: [{ nope: 1 }] }] } : { rows: [] },
    );
    const cache = getStreetsCache();
    cache.setPool(pool);

    await expect(cache.get('streets:broken')).resolves.toBeUndefined();
    expect(statements(query).some((sql) => sql.includes('DELETE FROM system.address_cache'))).toBe(
      true,
    );
  });

  /**
   * Removal has to reach the database tier. Dropping only the memory entry
   * would let the next `get()` read the row straight back out of Postgres, so
   * "deleted" would mean "deleted until the next miss".
   */
  it('deletes from the database tier as well, so the entry cannot resurrect', async () => {
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'false');
    const { pool, query } = mockPool(async () => ({ rows: [] }));
    const cache = getStreetsCache();
    cache.setPool(pool);

    await cache.set('streets:doomed', [{ name: 'Hauptstrasse' }]);
    await expect(cache.delete('streets:doomed')).resolves.toBe(true);

    expect(statements(query).some((sql) => sql.includes('DELETE FROM system.address_cache'))).toBe(
      true,
    );
  });

  it('clears the database tier even when PostGIS answers lookups locally', async () => {
    // `clear` uses the pool directly rather than the gated tier: rows written
    // before the flag was flipped still have to be purged.
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'true');
    const { pool, query } = mockPool(async () => ({ rows: [] }));
    const cache = getStreetsCache();
    cache.setPool(pool);

    await cache.set('streets:kept', [{ name: 'Hauptstrasse' }]);
    await cache.clear();

    expect(cache.size).toBe(0);
    expect(statements(query).some((sql) => sql.includes('DELETE FROM system.address_cache'))).toBe(
      true,
    );
  });

  it('reports how many expired rows the scheduled cleanup removed', async () => {
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'false');
    const { pool } = mockPool(async () => ({
      rows: [{ cache_key: 'a' }, { cache_key: 'b' }],
    }));
    const cache = getStreetsCache();
    cache.setPool(pool);

    await expect(cache.cleanupDatabase()).resolves.toBe(2);
  });

  it('survives a database error on read and reports a miss', async () => {
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'false');
    const { pool } = mockPool(async () => {
      throw new Error('connection terminated');
    });
    const cache = getStreetsCache();
    cache.setPool(pool);

    // A cache is an optimisation; a broken one must degrade to a miss rather
    // than propagate and fail the request it was meant to speed up.
    await expect(cache.get('streets:boom')).resolves.toBeUndefined();
    await expect(cache.has('streets:boom')).resolves.toBe(false);
  });
});

/**
 * The memory tier used to be unbounded, so a long-running instance answering
 * street lookups for arbitrary postal codes grew until the process died. These
 * assertions pin the two properties that keep it bounded: a hard entry cap with
 * LRU eviction, and expiry by TTL.
 */
describe('AddressCache memory bounds', () => {
  /** Values are already the right shape here, so the validator is identity. */
  const passthrough = <T extends object>(value: unknown): T | undefined => value as T;

  beforeEach(() => {
    resetConfig();
    vi.unstubAllEnvs();
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    // No pool is attached in this block, so the database tier is off either
    // way; pinning the flag keeps that independent of ambient config.
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'true');
  });

  afterEach(() => {
    vi.useRealTimers();
    resetConfig();
    vi.unstubAllEnvs();
  });

  it('never exceeds maxSize and evicts the least recently used entry', async () => {
    const cache = new AddressCache<{ n: number }>(24, 3, passthrough);

    for (const n of [1, 2, 3]) {
      await cache.set(`k${n}`, { n });
    }
    expect(cache.size).toBe(3);

    // Touch k1 so k2 becomes the least recently used.
    await expect(cache.get('k1')).resolves.toEqual({ n: 1 });

    await cache.set('k4', { n: 4 });

    expect(cache.size).toBe(3);
    await expect(cache.get('k2')).resolves.toBeUndefined();
    await expect(cache.get('k1')).resolves.toEqual({ n: 1 });
    await expect(cache.get('k4')).resolves.toEqual({ n: 4 });
  });

  it('stays at the cap under sustained inserts', async () => {
    const cache = new AddressCache<{ n: number }>(24, 10, passthrough);

    for (let n = 0; n < 500; n++) {
      await cache.set(`key-${n}`, { n });
    }

    expect(cache.size).toBe(10);
  });

  it('expires entries once the TTL has elapsed', async () => {
    // Real time rather than fake timers: lru-cache reads the clock through
    // `performance.now()`, which it captures at import, so the fakes never
    // reach it. A 25ms TTL with a 120ms wait keeps the test fast and the margin
    // wide enough not to be flaky.
    //
    // 25 rather than a rounder number because lru-cache rejects a non-integer
    // ttl and the constructor derives it as `ttlHours * 60 * 60 * 1000`; 25ms
    // survives that stepwise multiply exactly, 20ms does not.
    const cache = new AddressCache<{ n: number }>(25 / 3_600_000, 10, passthrough);

    await cache.set('fresh', { n: 1 });
    await expect(cache.get('fresh')).resolves.toEqual({ n: 1 });
    await expect(cache.has('fresh')).resolves.toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 120));

    await expect(cache.get('fresh')).resolves.toBeUndefined();
    await expect(cache.has('fresh')).resolves.toBe(false);
  });
});
