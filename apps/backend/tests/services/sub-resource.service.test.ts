import { ConflictError } from '@datenknoten/kit';
import type pg from 'pg';
import type { Logger } from 'pino';
import { describe, expect, it } from 'vitest';
import { FriendNotFoundError } from '../../src/errors/friend-not-found.error.js';
import { ResourceNotFoundError } from '../../src/errors/resource-not-found.error.js';
import {
  type SubResourceConfig,
  SubResourceService,
} from '../../src/services/base/sub-resource.service.js';

/**
 * The single-primary indexes are partial unique indexes, so two writers that
 * both clear the old primary and then insert can still collide. The base
 * service must report that as a retryable 409 rather than an unhandled driver
 * error (500).
 */

interface Data {
  value: string;
}

interface Row {
  value: string;
}

class TestSubResourceService extends SubResourceService<Data, Row, Row, Row, Row> {
  constructor(db: pg.Pool, overrides: Partial<SubResourceConfig<Data, Row, Row, Row, Row>> = {}) {
    super({
      db,
      // The service only logs at debug level; a full pino logger is noise here.
      logger: { debug: noop } as unknown as Logger,
      definition: {
        resourceName: 'phone',
        resourceLabel: 'Phone',
        ownerNotFound: FriendNotFoundError,
        hasPrimaryFlag: false,
        createFn() {
          return Promise.reject(new Error('not used'));
        },
        updateFn() {
          return Promise.reject(new Error('not used'));
        },
        deleteFn() {
          return Promise.resolve([]);
        },
        listFn() {
          return Promise.resolve([]);
        },
        mapListResult(row) {
          return row;
        },
        mapResult(row) {
          return row;
        },
        ...overrides,
      },
    });
  }
}

/**
 * Records the transaction control statements `withTransaction` issues, so a
 * test can tell a COMMIT from a ROLLBACK without a database.
 */
function noop() {
  return undefined;
}

function fakePool() {
  const statements: string[] = [];
  const client = {
    query(sql: string) {
      statements.push(sql);
      return Promise.resolve({ rows: [] });
    },
    release: noop,
  };
  const pool = {
    connect() {
      return Promise.resolve(client);
    },
  };
  // withTransaction only calls connect/query/release; the fake covers exactly that surface.
  return { pool: pool as unknown as pg.Pool, statements };
}

function rejectWith(error: Error) {
  return function reject() {
    return Promise.reject(error);
  };
}

function resolveWith<T>(value: T) {
  return function resolve() {
    return Promise.resolve(value);
  };
}

function alwaysTrue() {
  return true;
}

function pgUniqueViolation(constraint: string) {
  return Object.assign(new Error('dup'), { code: '23505', constraint });
}

describe('SubResourceService', () => {
  describe('write conflicts', () => {
    it('reports a lost single-primary race as a 409 conflict', async () => {
      const service = new TestSubResourceService(fakePool().pool, {
        createFn: rejectWith(pgUniqueViolation('idx_friend_phones_single_primary')),
      });

      const failure = service.add('user-1', 'friend-1', { value: '+1' });

      await expect(failure).rejects.toBeInstanceOf(ConflictError);
      await expect(failure).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    });

    it('passes every other unique violation through untouched', async () => {
      const original = pgUniqueViolation('some_other_index');
      const service = new TestSubResourceService(fakePool().pool, {
        createFn: rejectWith(original),
      });

      await expect(service.add('user-1', 'friend-1', { value: '+1' })).rejects.toBe(original);
    });

    it('returns the created row when the write succeeds', async () => {
      const service = new TestSubResourceService(fakePool().pool, {
        createFn: resolveWith([{ value: '+1' }]),
      });

      await expect(service.add('user-1', 'friend-1', { value: '+1' })).resolves.toEqual({
        value: '+1',
      });
    });
  });

  describe('primary handling for missing rows', () => {
    /**
     * Updating an unknown resource id with is_primary used to commit the
     * primary-clear and then answer 404, leaving the owner with zero primary
     * rows. The clear must roll back with the failed write.
     */
    it('rolls back the cleared primary when the update matches no row', async () => {
      const { pool, statements } = fakePool();
      let clears = 0;
      const service = new TestSubResourceService(pool, {
        hasPrimaryFlag: true,
        isPrimary: alwaysTrue,
        clearPrimaryFn() {
          clears += 1;
          return Promise.resolve(undefined);
        },
        updateFn: resolveWith([]),
      });

      const failure = service.update('user-1', 'friend-1', 'does-not-exist', { value: '+1' });

      await expect(failure).rejects.toBeInstanceOf(ResourceNotFoundError);
      await expect(failure).rejects.toMatchObject({ message: 'Phone not found: does-not-exist' });
      expect(clears).toBe(1);
      expect(statements).toEqual(['BEGIN', 'ROLLBACK']);
    });

    it('rolls back the cleared primary when the insert matches no owner', async () => {
      const { pool, statements } = fakePool();
      const service = new TestSubResourceService(pool, {
        hasPrimaryFlag: true,
        isPrimary: alwaysTrue,
        clearPrimaryFn: resolveWith(undefined),
        createFn: resolveWith([]),
      });

      const failure = service.add('user-1', 'unknown-owner', { value: '+1' });

      await expect(failure).rejects.toBeInstanceOf(FriendNotFoundError);
      await expect(failure).rejects.toMatchObject({ message: 'Friend not found: unknown-owner' });
      expect(statements).toEqual(['BEGIN', 'ROLLBACK']);
    });

    it('commits when the update wrote a row', async () => {
      const { pool, statements } = fakePool();
      const service = new TestSubResourceService(pool, {
        hasPrimaryFlag: true,
        isPrimary: alwaysTrue,
        clearPrimaryFn: resolveWith(undefined),
        updateFn: resolveWith([{ value: '+1' }]),
      });

      await expect(
        service.update('user-1', 'friend-1', 'exists', { value: '+1' }),
      ).resolves.toEqual({
        value: '+1',
      });
      expect(statements).toEqual(['BEGIN', 'COMMIT']);
    });
  });

  describe('delete', () => {
    it('rejects with the resource not-found error when no row was deleted', async () => {
      const service = new TestSubResourceService(fakePool().pool);

      const failure = service.delete('user-1', 'friend-1', 'does-not-exist');

      await expect(failure).rejects.toBeInstanceOf(ResourceNotFoundError);
      await expect(failure).rejects.toMatchObject({ message: 'Phone not found: does-not-exist' });
    });
  });
});
