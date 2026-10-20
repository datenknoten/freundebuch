import type pg from 'pg';
import { pino } from 'pino';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { AddressCache, createStreetsCache } from '../../src/utils/cache.js';

const SILENT_LOGGER = pino({ level: 'silent' });

interface QueryResult {
  rows: Record<string, unknown>[];
}

type QueryFn = (text: string, values?: unknown[]) => Promise<QueryResult>;

function mockPool(handler: QueryFn) {
  const query = vi.fn(handler);
  // The cache only reaches the database through pool.query.
  return { pool: { query } as unknown as pg.Pool, query };
}

/** The statements a PreparedQuery handed to pg, in call order. */
function statements(query: Mock<QueryFn>) {
  return query.mock.calls.map((call) => call[0]);
}

/** Answers `rows` to the statement containing `marker`, and no rows otherwise. */
function rowsFor(marker: string, rows: Record<string, unknown>[]) {
  return function query(text: string) {
    return Promise.resolve({ rows: text.includes(marker) === true ? rows : [] });
  };
}

function noRows() {
  return Promise.resolve({ rows: [] });
}

function connectionTerminated() {
  return Promise.reject(new Error('connection terminated'));
}

/** Values are already the right shape here, so the validator is identity. */
function passthrough(value: unknown) {
  // Identity validator: the fixtures are written in the cached shape.
  return value as { n: number };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AddressCache', () => {
  describe('database tier', () => {
    it('persists to and probes the database tier when PostGIS is off', async () => {
      const { pool, query } = mockPool(rowsFor('SELECT 1', [{ present: 1 }]));
      const cache = createStreetsCache({ db: pool, logger: SILENT_LOGGER });

      await cache.set('streets:off:1', [{ name: 'Hauptstrasse' }]);
      expect(
        statements(query).some((sql) => sql.includes('INSERT INTO system.address_cache')),
      ).toBe(true);

      // Absent from memory, present in the database tier.
      await expect(cache.has('streets:off:only-in-db')).resolves.toBe(true);
      expect(statements(query).some((sql) => sql.includes('SELECT 1 AS present'))).toBe(true);
    });

    it('treats a malformed cached row as a miss and deletes it', async () => {
      const { pool, query } = mockPool(
        rowsFor('SELECT cache_key', [{ cache_value: [{ nope: 1 }] }]),
      );
      const cache = createStreetsCache({ db: pool, logger: SILENT_LOGGER });

      await expect(cache.get('streets:broken')).resolves.toBeUndefined();
      expect(
        statements(query).some((sql) => sql.includes('DELETE FROM system.address_cache')),
      ).toBe(true);
    });

    /**
     * Removal has to reach the database tier. Dropping only the memory entry
     * would let the next `get()` read the row straight back out of Postgres, so
     * "deleted" would mean "deleted until the next miss".
     */
    it('deletes from the database tier as well, so the entry cannot resurrect', async () => {
      const { pool, query } = mockPool(noRows);
      const cache = createStreetsCache({ db: pool, logger: SILENT_LOGGER });

      await cache.set('streets:doomed', [{ name: 'Hauptstrasse' }]);
      await expect(cache.delete('streets:doomed')).resolves.toBe(true);

      expect(
        statements(query).some((sql) => sql.includes('DELETE FROM system.address_cache')),
      ).toBe(true);
    });

    it('clears the database tier even when PostGIS answers lookups locally', async () => {
      // The persisted tier is not gated on POSTGIS_ADDRESS_ENABLED: rows written
      // by any instance still have to be purged.
      const { pool, query } = mockPool(noRows);
      const cache = createStreetsCache({ db: pool, logger: SILENT_LOGGER });

      await cache.set('streets:kept', [{ name: 'Hauptstrasse' }]);
      await cache.clear();

      expect(cache.size).toBe(0);
      expect(
        statements(query).some((sql) => sql.includes('DELETE FROM system.address_cache')),
      ).toBe(true);
    });

    it('reports how many expired rows the scheduled cleanup removed', async () => {
      const { pool } = mockPool(rowsFor('', [{ cache_key: 'a' }, { cache_key: 'b' }]));
      const cache = createStreetsCache({ db: pool, logger: SILENT_LOGGER });

      await expect(cache.cleanupDatabase()).resolves.toBe(2);
    });

    it('survives a database error on read and reports a miss', async () => {
      const { pool } = mockPool(connectionTerminated);
      const cache = createStreetsCache({ db: pool, logger: SILENT_LOGGER });

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
  describe('memory bounds', () => {
    /** A database tier that never has a row, so every answer comes from memory. */
    function memoryOnlyCache(ttlHours: number, maxSize: number) {
      return new AddressCache<{ n: number }>({
        ttlHours,
        maxSize,
        validator: passthrough,
        db: mockPool(noRows).pool,
        logger: SILENT_LOGGER,
      });
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it('never exceeds maxSize and evicts the least recently used entry', async () => {
      const cache = memoryOnlyCache(24, 3);

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
      const cache = memoryOnlyCache(24, 10);

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
      const cache = memoryOnlyCache(25 / 3_600_000, 10);

      await cache.set('fresh', { n: 1 });
      await expect(cache.get('fresh')).resolves.toEqual({ n: 1 });
      await expect(cache.has('fresh')).resolves.toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 120));

      await expect(cache.get('fresh')).resolves.toBeUndefined();
      await expect(cache.has('fresh')).resolves.toBe(false);
    });
  });
});
