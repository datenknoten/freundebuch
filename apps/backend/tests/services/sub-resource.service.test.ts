import type pg from 'pg';
import type { Logger } from 'pino';
import { describe, expect, it } from 'vitest';
import {
  type SubResourceConfig,
  SubResourceService,
} from '../../src/services/base/sub-resource.service.js';
import { ConflictError } from '../../src/utils/errors.js';

/**
 * The single-primary indexes are partial unique indexes, so two writers that
 * both clear the old primary and then insert can still collide. The base
 * service must report that as a retryable 409 rather than an unhandled driver
 * error (500).
 */

interface Input {
  value: string;
}

interface Row {
  value: string;
}

class TestSubResourceService extends SubResourceService<Input, Row, Row, Row, Row> {
  constructor(db: pg.Pool, overrides: Partial<SubResourceConfig<Input, Row, Row, Row, Row>> = {}) {
    super(
      {
        db,
        logger: { debug: () => undefined } as unknown as Logger,
      },
      {
        resourceName: 'phone',
        hasPrimaryFlag: false,
        createFn: () => Promise.reject(new Error('not used')),
        updateFn: () => Promise.reject(new Error('not used')),
        deleteFn: () => Promise.resolve([]),
        listFn: () => Promise.resolve([]),
        mapListResult: (row) => row,
        mapResult: (row) => row,
        ...overrides,
      },
    );
  }
}

/**
 * Records the transaction control statements `withTransaction` issues, so a
 * test can tell a COMMIT from a ROLLBACK without a database.
 */
function fakePool(): { pool: pg.Pool; statements: string[] } {
  const statements: string[] = [];
  const client = {
    query: (sql: string) => {
      statements.push(sql);
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  return { pool: { connect: () => Promise.resolve(client) } as unknown as pg.Pool, statements };
}

function pgUniqueViolation(constraint: string): Error {
  return Object.assign(new Error('dup'), { code: '23505', constraint });
}

describe('SubResourceService write conflicts', () => {
  it('reports a lost single-primary race as a 409 conflict', async () => {
    const service = new TestSubResourceService(fakePool().pool, {
      createFn: () => Promise.reject(pgUniqueViolation('idx_friend_phones_single_primary')),
    });

    const failure = service.add('user-1', 'friend-1', { value: '+1' });

    await expect(failure).rejects.toBeInstanceOf(ConflictError);
    await expect(failure).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('passes every other unique violation through untouched', async () => {
    const original = pgUniqueViolation('some_other_index');
    const service = new TestSubResourceService(fakePool().pool, {
      createFn: () => Promise.reject(original),
    });

    await expect(service.add('user-1', 'friend-1', { value: '+1' })).rejects.toBe(original);
  });

  it('returns the created row when the write succeeds', async () => {
    const service = new TestSubResourceService(fakePool().pool, {
      createFn: () => Promise.resolve([{ value: '+1' }]),
    });

    await expect(service.add('user-1', 'friend-1', { value: '+1' })).resolves.toEqual({
      value: '+1',
    });
  });
});

describe('SubResourceService primary handling for missing rows', () => {
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
      isPrimary: () => true,
      clearPrimaryFn: () => {
        clears += 1;
        return Promise.resolve(undefined);
      },
      updateFn: () => Promise.resolve([]),
    });

    await expect(
      service.update('user-1', 'friend-1', 'does-not-exist', { value: '+1' }),
    ).resolves.toBeNull();
    expect(clears).toBe(1);
    expect(statements).toEqual(['BEGIN', 'ROLLBACK']);
  });

  it('rolls back the cleared primary when the insert matches no owner', async () => {
    const { pool, statements } = fakePool();
    const service = new TestSubResourceService(pool, {
      hasPrimaryFlag: true,
      isPrimary: () => true,
      clearPrimaryFn: () => Promise.resolve(undefined),
      createFn: () => Promise.resolve([]),
    });

    await expect(service.add('user-1', 'unknown-owner', { value: '+1' })).resolves.toBeNull();
    expect(statements).toEqual(['BEGIN', 'ROLLBACK']);
  });

  it('commits when the update wrote a row', async () => {
    const { pool, statements } = fakePool();
    const service = new TestSubResourceService(pool, {
      hasPrimaryFlag: true,
      isPrimary: () => true,
      clearPrimaryFn: () => Promise.resolve(undefined),
      updateFn: () => Promise.resolve([{ value: '+1' }]),
    });

    await expect(service.update('user-1', 'friend-1', 'exists', { value: '+1' })).resolves.toEqual({
      value: '+1',
    });
    expect(statements).toEqual(['BEGIN', 'COMMIT']);
  });
});
