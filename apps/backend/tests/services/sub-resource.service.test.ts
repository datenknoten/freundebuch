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
  constructor(createFn: SubResourceConfig<Input, Row, Row, Row, Row>['createFn']) {
    super(
      {
        db: {} as pg.Pool,
        logger: { debug: () => undefined } as unknown as Logger,
      },
      {
        resourceName: 'phone',
        hasPrimaryFlag: false,
        createFn,
        updateFn: () => Promise.reject(new Error('not used')),
        deleteFn: () => Promise.resolve([]),
        listFn: () => Promise.resolve([]),
        mapListResult: (row) => row,
        mapResult: (row) => row,
      },
    );
  }
}

function pgUniqueViolation(constraint: string): Error {
  return Object.assign(new Error('dup'), { code: '23505', constraint });
}

describe('SubResourceService write conflicts', () => {
  it('reports a lost single-primary race as a 409 conflict', async () => {
    const service = new TestSubResourceService(() =>
      Promise.reject(pgUniqueViolation('idx_friend_phones_single_primary')),
    );

    const failure = service.add('user-1', 'friend-1', { value: '+1' });

    await expect(failure).rejects.toBeInstanceOf(ConflictError);
    await expect(failure).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('passes every other unique violation through untouched', async () => {
    const original = pgUniqueViolation('some_other_index');
    const service = new TestSubResourceService(() => Promise.reject(original));

    await expect(service.add('user-1', 'friend-1', { value: '+1' })).rejects.toBe(original);
  });

  it('returns the created row when the write succeeds', async () => {
    const service = new TestSubResourceService(() => Promise.resolve([{ value: '+1' }]));

    await expect(service.add('user-1', 'friend-1', { value: '+1' })).resolves.toEqual({
      value: '+1',
    });
  });
});
