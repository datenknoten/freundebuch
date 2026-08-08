import {
  DQ_FIELD_CATALOG,
  type DqFriendFieldsResponse,
  type DqIndexResponse,
  type DqSuggestionsResponse,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import { describe, expect, it } from 'vitest';
import { authHeaders, createTestFriend, setupFriendsTestSuite } from './friends.helpers.js';

/**
 * YYYY-MM-DD for the database's CURRENT_DATE plus `days`.
 *
 * The server derives snooze deadlines from CURRENT_DATE, which follows the
 * database session's timezone rather than the test process's. Re-deriving the
 * day in JS drifts by one whenever the two disagree, so the database is asked.
 */
async function dateInDays(pool: pg.Pool, days: number): Promise<string> {
  const result = await pool.query<{ day: string }>(
    "SELECT to_char(CURRENT_DATE + $1::int, 'YYYY-MM-DD') AS day",
    [days],
  );
  return result.rows[0].day;
}

interface SnoozeResponse {
  snoozedUntil: string;
  laterCount: number;
}

describe('Data Quality API - Integration Tests', () => {
  const { getContext } = setupFriendsTestSuite();

  // The API contract is asserted through the shared DTOs; the cast is the usual
  // test-boundary narrowing of `Response.json()`.
  async function get<T>(path: string): Promise<{ response: Response; body: T }> {
    const { app, testUser } = getContext();
    const response = await app.fetch(
      new Request(`http://localhost${path}`, {
        method: 'GET',
        headers: authHeaders(testUser.sessionCookies),
      }),
    );
    return { response, body: (await response.json()) as T };
  }

  async function post<T>(path: string, payload: unknown): Promise<{ response: Response; body: T }> {
    const { app, testUser } = getContext();
    const response = await app.fetch(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: authHeaders(testUser.sessionCookies),
        body: JSON.stringify(payload),
      }),
    );
    return { response, body: (await response.json()) as T };
  }

  describe('GET /api/data-quality/suggestions', () => {
    it('suggests only cheap fields in the quick-wins bucket', async () => {
      const { pool, testUser } = getContext();
      await createTestFriend(pool, testUser.externalId, 'Anna');

      const { response, body } = await get<DqSuggestionsResponse>('/api/data-quality/suggestions');

      expect(response.status).toBe(200);
      expect(body.quickWins.length).toBeGreaterThan(0);
      const cheapKeys = DQ_FIELD_CATALOG.filter((field) => field.cost <= 1).map(
        (field) => field.key,
      );
      for (const item of body.quickWins) {
        expect(cheapKeys).toContain(item.fieldKey);
      }
    });

    it('carries at most three items per worthwhile entry', async () => {
      const { pool, testUser } = getContext();
      await createTestFriend(pool, testUser.externalId, 'Anna');

      const { body } = await get<DqSuggestionsResponse>('/api/data-quality/suggestions');

      expect(body.worthwhile.length).toBeGreaterThan(0);
      for (const entry of body.worthwhile) {
        expect(entry.items.length).toBeLessThanOrEqual(3);
        expect(entry.score).toBeGreaterThan(0);
      }
    });

    it('clamps limit to 20', async () => {
      const { pool, testUser } = getContext();
      for (let i = 0; i < 25; i++) {
        await createTestFriend(pool, testUser.externalId, `Friend ${i}`);
      }

      const { body } = await get<DqSuggestionsResponse>('/api/data-quality/suggestions?limit=99');

      expect(body.quickWins).toHaveLength(20);
      expect(body.worthwhile).toHaveLength(20);
    });

    it('returns only the requested bucket', async () => {
      const { pool, testUser } = getContext();
      await createTestFriend(pool, testUser.externalId, 'Anna');

      const quick = await get<DqSuggestionsResponse>(
        '/api/data-quality/suggestions?bucket=quickwins',
      );
      expect(quick.body.worthwhile).toEqual([]);
      expect(quick.body.quickWins.length).toBeGreaterThan(0);

      const worth = await get<DqSuggestionsResponse>(
        '/api/data-quality/suggestions?bucket=worthwhile',
      );
      expect(worth.body.quickWins).toEqual([]);
      expect(worth.body.worthwhile.length).toBeGreaterThan(0);
    });

    it('excludes the self-profile', async () => {
      const { body } = await get<DqSuggestionsResponse>('/api/data-quality/suggestions?limit=20');

      const names = body.worthwhile.map((entry) => entry.friendDisplayName);
      expect(names).not.toContain('Test User (Self)');
    });
  });

  describe('POST /api/data-quality/not-applicable', () => {
    it('hides a friend whose every field is not applicable', async () => {
      const { pool, testUser } = getContext();
      const friendId = await createTestFriend(pool, testUser.externalId, 'Invisible');

      for (const definition of DQ_FIELD_CATALOG) {
        const { response } = await post<{ message: string }>('/api/data-quality/not-applicable', {
          friendId,
          fieldKey: definition.key,
          value: true,
        });
        expect(response.status).toBe(200);
      }

      const { body } = await get<DqSuggestionsResponse>('/api/data-quality/suggestions?limit=20');

      expect(body.quickWins.map((item) => item.friendId)).not.toContain(friendId);
      expect(body.worthwhile.map((entry) => entry.friendId)).not.toContain(friendId);
    });

    it('rejects an unknown field key', async () => {
      const { pool, testUser } = getContext();
      const friendId = await createTestFriend(pool, testUser.externalId, 'Anna');

      const { response } = await post<unknown>('/api/data-quality/not-applicable', {
        friendId,
        fieldKey: 'not_a_catalog_field',
        value: true,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/data-quality/snooze', () => {
    it('escalates a second "later" to 90 days', async () => {
      const { pool, testUser } = getContext();
      const friendId = await createTestFriend(pool, testUser.externalId, 'Anna');
      const payload = { friendId, fieldKey: 'email', days: 30, reason: 'later' };

      const first = await post<SnoozeResponse>('/api/data-quality/snooze', payload);
      expect(first.response.status).toBe(200);
      expect(first.body.laterCount).toBe(1);
      expect(first.body.snoozedUntil).toBe(await dateInDays(pool, 30));

      const second = await post<SnoozeResponse>('/api/data-quality/snooze', payload);
      expect(second.body.laterCount).toBe(2);
      expect(second.body.snoozedUntil).toBe(await dateInDays(pool, 90));
    });

    it('removes the snoozed item from the suggestions', async () => {
      const { pool, testUser } = getContext();
      const friendId = await createTestFriend(pool, testUser.externalId, 'Anna');

      const before = await get<DqSuggestionsResponse>('/api/data-quality/suggestions?limit=20');
      expect(
        before.body.quickWins.some(
          (item) => item.friendId === friendId && item.fieldKey === 'email',
        ),
      ).toBe(true);

      await post<SnoozeResponse>('/api/data-quality/snooze', {
        friendId,
        fieldKey: 'email',
        days: 30,
        reason: 'later',
      });

      const after = await get<DqSuggestionsResponse>('/api/data-quality/suggestions?limit=20');
      expect(
        after.body.quickWins.some(
          (item) => item.friendId === friendId && item.fieldKey === 'email',
        ),
      ).toBe(false);
    });

    it('hides the whole friend when no field key is given', async () => {
      const { pool, testUser } = getContext();
      const friendId = await createTestFriend(pool, testUser.externalId, 'Anna');

      await post<SnoozeResponse>('/api/data-quality/snooze', {
        friendId,
        days: 30,
        reason: 'wont_ask',
      });

      const { body } = await get<DqSuggestionsResponse>('/api/data-quality/suggestions?limit=20');

      expect(body.quickWins.map((item) => item.friendId)).not.toContain(friendId);
      expect(body.worthwhile.map((entry) => entry.friendId)).not.toContain(friendId);
    });

    it('returns 404 for a friend the user does not own', async () => {
      const { response } = await post<unknown>('/api/data-quality/snooze', {
        friendId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        days: 30,
        reason: 'later',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/data-quality/friends/:id', () => {
    it('reports every catalog field', async () => {
      const { pool, testUser } = getContext();
      const friendId = await createTestFriend(pool, testUser.externalId, 'Anna');

      const { response, body } = await get<DqFriendFieldsResponse>(
        `/api/data-quality/friends/${friendId}`,
      );

      expect(response.status).toBe(200);
      expect(body.friendId).toBe(friendId);
      expect(body.fields).toHaveLength(DQ_FIELD_CATALOG.length);
      expect(body.fields.every((field) => field.isPresent === false)).toBe(true);
    });

    it('reflects a not-applicable toggle and a snooze', async () => {
      const { pool, testUser } = getContext();
      const friendId = await createTestFriend(pool, testUser.externalId, 'Anna');

      await post<{ message: string }>('/api/data-quality/not-applicable', {
        friendId,
        fieldKey: 'photo',
        value: true,
      });
      await post<SnoozeResponse>('/api/data-quality/snooze', {
        friendId,
        fieldKey: 'email',
        days: 30,
        reason: 'later',
      });

      const { body } = await get<DqFriendFieldsResponse>(`/api/data-quality/friends/${friendId}`);
      const byKey = new Map(body.fields.map((field) => [field.fieldKey, field]));

      expect(byKey.get('photo')?.isNotApplicable).toBe(true);
      expect(byKey.get('email')?.isSnoozed).toBe(true);
      expect(byKey.get('birthday')?.isSnoozed).toBe(false);
    });

    it('returns 404 for an unknown friend', async () => {
      const { response } = await get<unknown>(
        '/api/data-quality/friends/3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      );

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/data-quality/index', () => {
    it('computes the current index live with an empty history', async () => {
      const { pool, testUser } = getContext();
      await createTestFriend(pool, testUser.externalId, 'Anna');

      const { response, body } = await get<DqIndexResponse>('/api/data-quality/index');

      expect(response.status).toBe(200);
      // Every field of the only scoreable friend is empty.
      expect(body.current).toBe(0);
      expect(body.history).toEqual([]);
    });
  });

  describe('provenance', () => {
    it('records presence when a value is written through the API', async () => {
      const { app, pool, testUser } = getContext();
      const friendId = await createTestFriend(pool, testUser.externalId, 'Anna');

      const created = await app.fetch(
        new Request(`http://localhost/api/friends/${friendId}/emails`, {
          method: 'POST',
          headers: authHeaders(testUser.sessionCookies),
          body: JSON.stringify({ email_address: 'anna@example.com', email_type: 'personal' }),
        }),
      );
      expect(created.status).toBe(201);

      const { body } = await get<DqFriendFieldsResponse>(`/api/data-quality/friends/${friendId}`);
      const email = body.fields.find((field) => field.fieldKey === 'email');

      expect(email?.isPresent).toBe(true);
      expect(email?.isStale).toBe(false);
      expect(typeof email?.verifiedAt).toBe('string');
    });
  });
});
