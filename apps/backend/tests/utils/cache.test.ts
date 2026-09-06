import type pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { getStreetsCache } from '../../src/utils/cache.js';
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
});
