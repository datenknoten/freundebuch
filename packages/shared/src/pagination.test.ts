import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { CollectiveListQuerySchema, parseCollectiveListQuery } from './collectives.js';
import { EncounterListQuerySchema, parseEncounterListQuery } from './encounters.js';
import { FriendListQuerySchema, parseFriendListQuery } from './friends.js';
import {
  MAX_PAGE_SIZE,
  type PaginationOptions,
  type PaginationQuery,
  parsePaginationQuery,
} from './pagination.js';

describe('parsePaginationQuery', () => {
  it('defaults to page 1 and the endpoint default', () => {
    expect(parsePaginationQuery({}, 20)).toEqual({ page: 1, pageSize: 20 });
  });

  it('reads the canonical page_size', () => {
    expect(parsePaginationQuery({ page: '3', page_size: '10' }, 20)).toEqual({
      page: 3,
      pageSize: 10,
    });
  });

  /**
   * `pageSize` was the spelling `/api/friends` and the search endpoints
   * shipped. It is gone, not aliased, so it now reads as any other parameter
   * the API has no rule for: carried through validation, never looked at, and
   * the endpoint default applies. A client still sending it gets a full-size
   * page rather than a silently different one.
   */
  it('does not honour the removed camelCase pageSize', () => {
    const query: Record<string, string> = { pageSize: '10' };
    expect(parsePaginationQuery(query, 20)).toEqual({ page: 1, pageSize: 20 });
  });

  it('caps the page size', () => {
    expect(parsePaginationQuery({ page_size: '5000' }, 20).pageSize).toBe(MAX_PAGE_SIZE);
  });

  /**
   * Unusable input falls back to the default rather than to a boundary, so
   * `?page_size=0` returns a normal page instead of a single row.
   */
  it.each(['', '0', '-5', 'abc', 'NaN'])('falls back to the default for %o', (value: string) => {
    expect(parsePaginationQuery({ page_size: value }, 20).pageSize).toBe(20);
    expect(parsePaginationQuery({ page: value }, 20).page).toBe(1);
  });

  it('ignores an empty page_size', () => {
    expect(parsePaginationQuery({ page_size: '' }, 20).pageSize).toBe(20);
  });
});

/**
 * The bug this contract exists to prevent: `/api/friends` took `pageSize`
 * while `/api/collectives` and `/api/encounters` took `page_size`. ArkType
 * passes undeclared keys through untouched, so the wrong spelling validated
 * cleanly and was then never read — `?page_size=3` against `/api/friends`
 * returned every row with no error.
 *
 * The parsers are listed under the shared signature on purpose: a parser that
 * stopped accepting the common query would no longer typecheck here.
 */
describe('every list endpoint accepts the same pagination parameters', () => {
  const endpoints: Array<{
    name: string;
    parse: (query: PaginationQuery) => PaginationOptions;
    defaultPageSize: number;
  }> = [
    { name: 'friends', parse: parseFriendListQuery, defaultPageSize: 25 },
    { name: 'collectives', parse: parseCollectiveListQuery, defaultPageSize: 20 },
    { name: 'encounters', parse: parseEncounterListQuery, defaultPageSize: 20 },
  ];

  for (const { name, parse, defaultPageSize } of endpoints) {
    it(`${name} honours page_size`, () => {
      expect(parse({ page: '2', page_size: '5' })).toMatchObject({ page: 2, pageSize: 5 });
    });

    it(`${name} ignores the removed pageSize`, () => {
      const query: Record<string, string> = { pageSize: '5' };
      expect(parse(query)).toMatchObject({ page: 1, pageSize: defaultPageSize });
    });

    it(`${name} defaults to ${defaultPageSize} per page`, () => {
      expect(parse({})).toMatchObject({ page: 1, pageSize: defaultPageSize });
    });
  }

  /**
   * Every schema must declare `page_size`, because a value ArkType has no rule
   * for is simply carried through: `onUndeclaredKey` defaults to `ignore`, so
   * an undeclared key is neither rejected nor stripped. That is precisely how
   * the old mismatch stayed silent — the wrong spelling validated fine and
   * nothing ever read it. Validation cannot catch a misspelled parameter here;
   * only declaring one spelling and using it everywhere can.
   */
  it.each([
    ['friends', FriendListQuerySchema],
    ['collectives', CollectiveListQuerySchema],
    ['encounters', EncounterListQuerySchema],
  ])('%s schema declares page_size', (_name, schema) => {
    expect(schema({ page: '2', page_size: '5' })).toMatchObject({ page: '2', page_size: '5' });
    // Declared, so a wrong type is a real validation error...
    expect(schema({ page_size: 5 })).toBeInstanceOf(type.errors);
    // ...while an undeclared key rides along untouched and means nothing.
    expect(schema({ pageSize: '5' })).toMatchObject({ pageSize: '5' });
  });
});
