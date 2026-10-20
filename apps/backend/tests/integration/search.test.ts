import { parseWith } from '@datenknoten/kit/schema';
import {
  ErrorResponseSchema,
  FacetedSearchResponseSchema,
  FriendSearchResultResponseSchema,
  GlobalSearchResultResponseSchema,
  PaginatedSearchResponseSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import type pg from 'pg';
import { describe, expect, it } from 'vitest';
import { completeTestUserOnboarding } from './auth.helpers.js';
import { createAuthenticatedUser } from './friends.helpers.js';
import {
  authHeaders,
  createCircleWithFriend,
  createFriendWithAddress,
  createFriendWithEmail,
  createFriendWithFriendNote,
  createFriendWithFullName,
  createFriendWithMetContext,
  createFriendWithNotes,
  createFriendWithOrganization,
  createFriendWithPhone,
  createFriendWithWorkNotes,
  createTestFriend,
  type SearchTestContext,
  setupSearchTestSuite,
} from './search.helpers.js';

const RecentSearchesResponseSchema = type('string[]');

/**
 * Create a friend with interests (weight C in the search vector)
 */
async function createFriendWithInterests(
  pool: pg.Pool,
  userExternalId: string,
  displayName: string,
  interests: string,
) {
  const friendExternalId = await createTestFriend(pool, userExternalId, displayName);

  await pool.query('UPDATE friends.friends SET interests = $2 WHERE external_id = $1', [
    friendExternalId,
    interests,
  ]);

  return friendExternalId;
}

async function fetchFilterOnlyListing(context: SearchTestContext, sortOrder: 'asc' | 'desc') {
  const response = await context.app.fetch(
    new Request(
      `http://localhost/api/friends/search/faceted?organization=Acme Corp&sort_by=display_name&sort_order=${sortOrder}`,
      { method: 'GET', headers: authHeaders(context.testUser.sessionCookies) },
    ),
  );
  expect(response.status).toBe(200);
  const body = parseWith(FacetedSearchResponseSchema, await response.json());
  return body.data.map((row) => row.displayName);
}

describe('Friend search API', () => {
  const { getContext } = setupSearchTestSuite();

  describe('GET /api/friends/search/full', () => {
    describe('Basic Search Functionality', () => {
      it('returns matching friends by display name', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Smith');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');
        await createTestFriend(pool, testUser.externalId, 'Alice Johnson');

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(2);
        expect(body.every((r) => r.displayName.toLowerCase().includes('alice'))).toBe(true);
      });

      it('returns empty array when no matches found', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Smith');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');

        const request = new Request('http://localhost/api/friends/search/full?q=xyz123', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
      });

      it('searches by first name', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithFullName(pool, testUser.externalId, 'Dr. Smith', 'John', 'Smith');
        await createTestFriend(pool, testUser.externalId, 'Jane Doe');

        const request = new Request('http://localhost/api/friends/search/full?q=john', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Dr. Smith');
      });

      it('searches by last name', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithFullName(pool, testUser.externalId, 'John Smith', 'John', 'Smith');
        await createFriendWithFullName(pool, testUser.externalId, 'Jane Smith', 'Jane', 'Smith');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');

        const request = new Request('http://localhost/api/friends/search/full?q=smith', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(2);
        expect(body.every((r) => r.displayName.includes('Smith'))).toBe(true);
      });

      it('searches by organization', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice', 'Acme Corporation');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob', 'Acme Labs');
        await createFriendWithOrganization(pool, testUser.externalId, 'Charlie', 'Other Company');

        const request = new Request('http://localhost/api/friends/search/full?q=acme', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(2);
        expect(body.every((r) => r.organization?.toLowerCase().includes('acme'))).toBe(true);
      });

      it('searches by job title', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Alice',
          'Tech Corp',
          'Software Engineer',
        );
        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Bob',
          'Other Corp',
          'Senior Engineer',
        );
        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Charlie',
          'Another Corp',
          'Designer',
        );

        const request = new Request('http://localhost/api/friends/search/full?q=engineer', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(2);
        expect(body.every((r) => r.jobTitle?.toLowerCase().includes('engineer'))).toBe(true);
      });
    });

    describe('Search by Related Data', () => {
      it('searches by email address', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithEmail(pool, testUser.externalId, 'Alice', 'alice@example.com');
        await createFriendWithEmail(pool, testUser.externalId, 'Bob', 'bob@different.org');

        const request = new Request('http://localhost/api/friends/search/full?q=example.com', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Alice');
        expect(body[0]?.matchSource).toBe('email');
      });

      it('searches by phone number', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithPhone(pool, testUser.externalId, 'Alice', '+14155551234');
        await createFriendWithPhone(pool, testUser.externalId, 'Bob', '+13105559999');

        const request = new Request('http://localhost/api/friends/search/full?q=415555', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Alice');
        expect(body[0]?.matchSource).toBe('phone');
      });

      it('does not match phone numbers when query has no digits', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithPhone(pool, testUser.externalId, 'Alice Smith', '+14155551234');
        await createFriendWithPhone(pool, testUser.externalId, 'Bob Jones', '+13105559999');
        await createTestFriend(pool, testUser.externalId, 'Christian Patsch');

        const request = new Request('http://localhost/api/friends/search/full?q=patsch', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Christian Patsch');
        expect(body[0]?.matchSource).toBe('friend');
        expect(body.some((r) => r.displayName === 'Alice Smith')).toBe(false);
        expect(body.some((r) => r.displayName === 'Bob Jones')).toBe(false);
      });

      it('searches by relationship notes', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithNotes(pool, testUser.externalId, 'Alice', 'Met at tech conference');
        await createFriendWithNotes(pool, testUser.externalId, 'Bob', 'College roommate');

        const request = new Request('http://localhost/api/friends/search/full?q=conference', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Alice');
        expect(body[0]?.matchSource).toBe('notes');
      });

      it('searches by friend notes with German stemming', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithFriendNote(
          pool,
          testUser.externalId,
          'Clara Note',
          'Sie sammelt alte Bücher',
        );
        await createFriendWithFriendNote(pool, testUser.externalId, 'Dora Note', 'Spielt Tennis');

        // "Buch" matches "Bücher" only through the 'german' stemmer, not through ILIKE.
        const request = new Request('http://localhost/api/friends/search/full?q=Buch', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0]?.displayName).toBe('Clara Note');
        expect(body[0]?.matchSource).toBe('notes');
      });

      it('searches by met context', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithMetContext(
          pool,
          testUser.externalId,
          'Alice',
          'Introduced at the hackathon',
        );
        await createFriendWithMetContext(pool, testUser.externalId, 'Bob', 'School friend');

        const request = new Request('http://localhost/api/friends/search/full?q=hackathon', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Alice');
        expect(body[0]?.matchSource).toBe('notes');
      });

      it('searches by work notes', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithWorkNotes(
          pool,
          testUser.externalId,
          'Alice',
          'Expert in machine learning',
        );
        await createFriendWithWorkNotes(pool, testUser.externalId, 'Bob', 'Works on frontend');

        const request = new Request('http://localhost/api/friends/search/full?q=machine learning', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Alice');
      });
    });

    describe('German Dictionary', () => {
      it('matches a German stem across inflections', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithInterests(pool, testUser.externalId, 'Anna Leser', 'Bücher lesen');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');

        const request = new Request('http://localhost/api/friends/search/full?q=Buch', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Anna Leser');
        expect(body[0]?.matchSource).toBe('friend');
      });

      it('matches a German verb regardless of conjugation', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithInterests(pool, testUser.externalId, 'Anna Leser', 'Bücher lesen');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');

        const request = new Request('http://localhost/api/friends/search/full?q=Lesen', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Anna Leser');
      });

      it('matches a formatted phone number by its digits alone', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithPhone(pool, testUser.externalId, 'Bernd Berlin', '+49 30 1234 5678');
        await createFriendWithPhone(pool, testUser.externalId, 'Bob Jones', '+49 89 9999 0000');

        const request = new Request('http://localhost/api/friends/search/full?q=3012345678', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Bernd Berlin');
        expect(body[0]?.matchSource).toBe('phone');
      });
    });

    describe('Search Result Quality', () => {
      it('only returns results that match the search term', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Antonia Patsch');
        await createTestFriend(pool, testUser.externalId, 'Christian Patsch');
        await createTestFriend(pool, testUser.externalId, 'Anja Schumacher');
        await createTestFriend(pool, testUser.externalId, 'Christian Werner');
        await createTestFriend(pool, testUser.externalId, 'Dina Schmitt');

        const request = new Request('http://localhost/api/friends/search/full?q=patsch', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(2);
        expect(body.every((r) => r.displayName.toLowerCase().includes('patsch'))).toBe(true);
        expect(body.some((r) => r.displayName.includes('Schumacher'))).toBe(false);
        expect(body.some((r) => r.displayName.includes('Werner'))).toBe(false);
        expect(body.some((r) => r.displayName.includes('Schmitt'))).toBe(false);
      });

      it('returns relevance-ranked results', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Smith');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob Jones', 'Alice Corp');
        await createFriendWithWorkNotes(
          pool,
          testUser.externalId,
          'Charlie Davis',
          'Works with Alice',
        );

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBeGreaterThanOrEqual(1);
        // Name matches should have highest rank
        expect(body[0]?.displayName).toBe('Alice Smith');
        expect(body[0]?.rank).toBeGreaterThan(0);
      });

      it('includes headline with marked search terms', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Smith');

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.headline).toBeDefined();
        // Headline should contain mark tags (sanitized)
        expect(body[0]?.headline).toMatch(/<mark>.*<\/mark>/);
      });

      it('returns primary email and phone in results', async () => {
        const { app, pool, testUser } = getContext();

        const friendId = await createFriendWithEmail(
          pool,
          testUser.externalId,
          'Alice Smith',
          'alice@example.com',
        );

        const friendResult = await pool.query<{ id: string }>(
          'SELECT id FROM friends.friends WHERE external_id = $1',
          [friendId],
        );
        await pool.query(
          `INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
           VALUES ($1, '+14155551234', 'mobile', true)`,
          [friendResult.rows[0]?.id],
        );

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.primaryEmail).toBe('alice@example.com');
        expect(body[0]?.primaryPhone).toBe('+14155551234');
      });
    });

    describe('Search Limit Parameter', () => {
      it('respects limit parameter', async () => {
        const { app, pool, testUser } = getContext();

        for (let i = 0; i < 10; i++) {
          await createTestFriend(pool, testUser.externalId, `Alice ${i}`);
        }

        const request = new Request('http://localhost/api/friends/search/full?q=alice&limit=3', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(3);
      });

      it('defaults to 10 results', async () => {
        const { app, pool, testUser } = getContext();

        for (let i = 0; i < 15; i++) {
          await createTestFriend(pool, testUser.externalId, `Alice ${i}`);
        }

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(10);
      });

      it('accepts a limit above the cap of 50', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=alice&limit=100', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);

        // Should not error, just cap at 50
        expect(response.status).toBe(200);
      });
    });

    describe('Validation', () => {
      it('rejects empty query', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('rejects missing query parameter', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('rejects query shorter than 2 characters', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=a', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('requires authentication', async () => {
        const { app } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(401);
      });
    });

    describe('User Isolation', () => {
      it('only returns friends belonging to authenticated user', async () => {
        const { app, pool, testUser } = getContext();

        const otherUser = await createAuthenticatedUser(
          pool,
          'other-search@example.com',
          'Password123!',
        );
        await completeTestUserOnboarding(pool, otherUser.externalId);
        await createTestFriend(pool, otherUser.externalId, 'Alice Other');

        await createTestFriend(pool, testUser.externalId, 'Alice Mine');

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Alice Mine');
      });
    });

    describe('Edge Cases', () => {
      it('matches a query containing an apostrophe', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, "Alice O'Brien");
        await createTestFriend(pool, testUser.externalId, 'Bob Smith');

        const request = new Request(
          `http://localhost/api/friends/search/full?q=${encodeURIComponent("O'Brien")}`,
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe("Alice O'Brien");
      });

      it('matches a query containing umlauts', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Müller Schmidt');
        await createTestFriend(pool, testUser.externalId, 'Bob Smith');

        const request = new Request(
          `http://localhost/api/friends/search/full?q=${encodeURIComponent('Müller')}`,
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Müller Schmidt');
      });

      it('rejects a whitespace-only query', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=   ', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('matches a query with multiple words', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Marie Smith');
        await createTestFriend(pool, testUser.externalId, 'Alice Johnson');
        await createTestFriend(pool, testUser.externalId, 'Bob Smith');

        const request = new Request('http://localhost/api/friends/search/full?q=alice smith', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        // Should find Alice Marie Smith (best match) at minimum
        expect(body.length).toBeGreaterThanOrEqual(1);
      });

      it('does not return deleted friends', async () => {
        const { app, pool, testUser } = getContext();

        const friendId = await createTestFriend(pool, testUser.externalId, 'Alice Deleted');
        await createTestFriend(pool, testUser.externalId, 'Alice Active');

        await pool.query('UPDATE friends.friends SET deleted_at = NOW() WHERE external_id = $1', [
          friendId,
        ]);

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(GlobalSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Alice Active');
      });

      it('accepts a 200-character query', async () => {
        const { app, testUser } = getContext();

        const longQuery = 'a'.repeat(200);

        const request = new Request(`http://localhost/api/friends/search/full?q=${longQuery}`, {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);

        // Should not crash, may return empty results
        expect(response.status).toBe(200);
      });
    });
  });

  describe('GET /api/friends/search/paginated', () => {
    describe('with a matching query', () => {
      it('returns paginated search results', async () => {
        const { app, pool, testUser } = getContext();

        for (let i = 0; i < 15; i++) {
          await createTestFriend(pool, testUser.externalId, `Alice ${String(i).padStart(2, '0')}`);
        }

        const request = new Request(
          'http://localhost/api/friends/search/paginated?q=alice&page=1&page_size=5',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(PaginatedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(5);
        expect(body.pagination.totalCount).toBe(15);
        expect(body.pagination.page).toBe(1);
        expect(body.pagination.pageSize).toBe(5);
        expect(body.pagination.totalPages).toBe(3);
      });

      it('supports sorting by display name', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice C');
        await createTestFriend(pool, testUser.externalId, 'Alice A');
        await createTestFriend(pool, testUser.externalId, 'Alice B');

        const request = new Request(
          'http://localhost/api/friends/search/paginated?q=alice&sort_by=display_name&sort_order=asc',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(PaginatedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data[0]?.displayName).toBe('Alice A');
        expect(body.data[1]?.displayName).toBe('Alice B');
        expect(body.data[2]?.displayName).toBe('Alice C');
      });

      it('supports sorting by relevance', async () => {
        const { app, pool, testUser } = getContext();

        // Name with alice should rank higher
        await createTestFriend(pool, testUser.externalId, 'Alice Smith');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob Jones', 'Alice Corp');

        const request = new Request(
          'http://localhost/api/friends/search/paginated?q=alice&sort_by=relevance&sort_order=desc',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(PaginatedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data[0]?.displayName).toBe('Alice Smith');
      });

      it('returns correct page of results', async () => {
        const { app, pool, testUser } = getContext();

        for (let i = 0; i < 10; i++) {
          await createTestFriend(pool, testUser.externalId, `Alice ${String(i).padStart(2, '0')}`);
        }

        const request = new Request(
          'http://localhost/api/friends/search/paginated?q=alice&page=2&page_size=3&sort_by=display_name&sort_order=asc',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(PaginatedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(3);
        expect(body.pagination.page).toBe(2);
        // Page 2 with pageSize 3 should have items 3, 4, 5 (0-indexed: 03, 04, 05)
        expect(body.data[0]?.displayName).toBe('Alice 03');
        expect(body.data[1]?.displayName).toBe('Alice 04');
        expect(body.data[2]?.displayName).toBe('Alice 05');
      });
    });
  });

  describe('GET /api/friends/search/faceted', () => {
    describe('Search with Filters', () => {
      it('filters by city', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithAddress(pool, testUser.externalId, 'Alice NYC', 'New York', 'US');
        await createFriendWithAddress(pool, testUser.externalId, 'Alice LA', 'Los Angeles', 'US');
        await createFriendWithAddress(pool, testUser.externalId, 'Alice SF', 'San Francisco', 'US');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&city=New York',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(1);
        expect(body.data[0]?.displayName).toBe('Alice NYC');
      });

      it('filters by country', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithAddress(pool, testUser.externalId, 'Alice USA', 'New York', 'US');
        await createFriendWithAddress(pool, testUser.externalId, 'Alice UK', 'London', 'GB');
        await createFriendWithAddress(pool, testUser.externalId, 'Alice Germany', 'Berlin', 'DE');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&country=US',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(1);
        expect(body.data[0]?.displayName).toBe('Alice USA');
      });

      it('filters by organization', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Acme', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Tech', 'Tech Inc');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Start', 'Startup LLC');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&organization=Acme Corp',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(1);
        expect(body.data[0]?.displayName).toBe('Alice Acme');
      });

      it('filters by job title', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Alice Eng',
          'Tech Corp',
          'Engineer',
        );
        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Alice Des',
          'Tech Corp',
          'Designer',
        );
        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Alice PM',
          'Tech Corp',
          'Product Manager',
        );

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&job_title=Engineer',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(1);
        expect(body.data[0]?.displayName).toBe('Alice Eng');
      });

      it('filters by circle', async () => {
        const { app, pool, testUser } = getContext();

        const friend1Id = await createTestFriend(pool, testUser.externalId, 'Alice Circle1');
        await createTestFriend(pool, testUser.externalId, 'Alice Circle2');
        await createTestFriend(pool, testUser.externalId, 'Alice NoCircle');

        const circleId = await createCircleWithFriend(
          pool,
          testUser.externalId,
          'Friends',
          friend1Id,
        );

        const request = new Request(
          `http://localhost/api/friends/search/faceted?q=alice&circles=${circleId}`,
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(1);
        expect(body.data[0]?.displayName).toBe('Alice Circle1');
      });

      it('combines multiple filters with AND logic', async () => {
        const { app, pool, testUser } = getContext();

        const friend1Id = await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Alice Match',
          'Acme Corp',
        );
        const friend1Result = await pool.query<{ id: string }>(
          'SELECT id FROM friends.friends WHERE external_id = $1',
          [friend1Id],
        );
        await pool.query(
          `INSERT INTO friends.friend_addresses (friend_id, city, country, address_type, is_primary)
           VALUES ($1, 'New York', 'US', 'home', true)`,
          [friend1Result.rows[0]?.id],
        );

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice OrgOnly', 'Acme Corp');

        await createFriendWithAddress(
          pool,
          testUser.externalId,
          'Alice CityOnly',
          'New York',
          'US',
        );

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&organization=Acme Corp&city=New York',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(1);
        expect(body.data[0]?.displayName).toBe('Alice Match');
      });
    });

    describe('Search Results Must Match Query', () => {
      it('only returns results matching both query AND filters', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Acme', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob Acme', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Other', 'Other Corp');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&organization=Acme Corp',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(1);
        expect(body.data[0]?.displayName).toBe('Alice Acme');
      });

      it('does not return results that only match filter but not query', async () => {
        const { app, pool, testUser } = getContext();

        // Searching for "patsch" should NOT return people who don't have "patsch" anywhere
        // even if they match some filter criteria

        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Antonia Patsch',
          'Tech Corp',
        );
        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Christian Patsch',
          'Tech Corp',
        );
        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Anja Schumacher',
          'Tech Corp',
        );
        await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Christian Werner',
          'Tech Corp',
        );

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=patsch&organization=Tech Corp',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(2);
        expect(body.data.every((r) => r.displayName.includes('Patsch'))).toBe(true);
        expect(body.data.some((r) => r.displayName.includes('Schumacher'))).toBe(false);
        expect(body.data.some((r) => r.displayName.includes('Werner'))).toBe(false);
      });
    });

    describe('Facet Counts', () => {
      it('returns facet counts when include_facets=true', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice 1', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice 2', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice 3', 'Tech Inc');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&include_facets=true',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.facets).toBeDefined();
        expect(body.facets?.professional).toBeDefined();
        const orgFacet = body.facets?.professional.find((f) => f.field === 'organization');
        expect(orgFacet?.values.length).toBeGreaterThan(0);
      });

      it('returns circle information in results', async () => {
        const { app, pool, testUser } = getContext();

        const friendId = await createTestFriend(pool, testUser.externalId, 'Alice WithCircle');
        await createCircleWithFriend(pool, testUser.externalId, 'Friends', friendId);

        const request = new Request('http://localhost/api/friends/search/faceted?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(1);
        expect(body.data[0]?.circles.map((circle) => circle.name)).toEqual(['Friends']);
      });
    });

    describe('Filter-Only Mode (No Query)', () => {
      it('works with only filters and no search query', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Charlie', 'Other Corp');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?organization=Acme Corp',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FacetedSearchResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.data.length).toBe(2);
        expect(body.data.every((r) => r.organization === 'Acme Corp')).toBe(true);
      });

      /**
       * The page order lives in a CTE that the final CROSS JOIN is free to
       * reorder, so the query has to carry it out as sort_position and order
       * the result by it — the same way the two query-based siblings do.
       */
      it('returns a filter-only listing in the requested order', async () => {
        const context = getContext();
        const { pool, testUser } = context;

        await createFriendWithOrganization(pool, testUser.externalId, 'Charlie', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob', 'Acme Corp');

        expect(await fetchFilterOnlyListing(context, 'asc')).toEqual(['Alice', 'Bob', 'Charlie']);
        expect(await fetchFilterOnlyListing(context, 'desc')).toEqual(['Charlie', 'Bob', 'Alice']);
      });

      it('rejects request with no query and no filters', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/faceted', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('rejects an unknown relationship_category with 400 naming the value', async () => {
        const { app, testUser } = getContext();

        const request = new Request(
          'http://localhost/api/friends/search/faceted?relationship_category=family,enemies',
          { method: 'GET', headers: authHeaders(testUser.sessionCookies) },
        );

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
        expect(parseWith(ErrorResponseSchema, await response.json())).toEqual({
          error: 'Invalid relationship_category: enemies',
          code: 'VALIDATION_ERROR',
          details: { relationship_category: ['enemies'] },
        });
      });
    });
  });

  describe('GET /api/friends/search/recent', () => {
    describe('when no search was stored', () => {
      it('returns empty array when no recent searches', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/recent', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(RecentSearchesResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
      });
    });

    describe('when searches were stored', () => {
      it('returns recent searches in order', async () => {
        const { app, testUser } = getContext();

        for (const query of ['alice', 'bob', 'charlie']) {
          const addRequest = new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.sessionCookies),
            body: JSON.stringify({ query }),
          });
          await app.fetch(addRequest);
        }

        const request = new Request('http://localhost/api/friends/search/recent', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(RecentSearchesResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(3);
        // Most recent first
        expect(body[0]).toBe('charlie');
        expect(body[1]).toBe('bob');
        expect(body[2]).toBe('alice');
      });

      it('respects limit parameter', async () => {
        const { app, testUser } = getContext();

        for (let i = 0; i < 5; i++) {
          const addRequest = new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.sessionCookies),
            body: JSON.stringify({ query: `search${i}` }),
          });
          await app.fetch(addRequest);
        }

        const request = new Request('http://localhost/api/friends/search/recent?limit=3', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(RecentSearchesResponseSchema, await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(3);
      });
    });
  });

  describe('POST /api/friends/search/recent', () => {
    describe('with a valid query', () => {
      it('adds a recent search', async () => {
        const { app, testUser } = getContext();

        const addRequest = new Request('http://localhost/api/friends/search/recent', {
          method: 'POST',
          headers: authHeaders(testUser.sessionCookies),
          body: JSON.stringify({ query: 'test search' }),
        });

        const addResponse = await app.fetch(addRequest);

        expect(addResponse.status).toBe(201);

        const getRequest = new Request('http://localhost/api/friends/search/recent', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const getResponse = await app.fetch(getRequest);
        const body = parseWith(RecentSearchesResponseSchema, await getResponse.json());

        expect(body).toContain('test search');
      });

      it('updates timestamp when adding duplicate search', async () => {
        const { app, testUser } = getContext();

        await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.sessionCookies),
            body: JSON.stringify({ query: 'alice' }),
          }),
        );

        await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.sessionCookies),
            body: JSON.stringify({ query: 'bob' }),
          }),
        );

        // Re-add first search (should move to top)
        await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.sessionCookies),
            body: JSON.stringify({ query: 'alice' }),
          }),
        );

        const response = await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          }),
        );
        const body = parseWith(RecentSearchesResponseSchema, await response.json());

        expect(body.length).toBe(2);
        expect(body[0]).toBe('alice'); // Most recent
        expect(body[1]).toBe('bob');
      });
    });

    describe('with an invalid query', () => {
      it('rejects empty query', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/recent', {
          method: 'POST',
          headers: authHeaders(testUser.sessionCookies),
          body: JSON.stringify({ query: '' }),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('rejects query shorter than 2 characters', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/recent', {
          method: 'POST',
          headers: authHeaders(testUser.sessionCookies),
          body: JSON.stringify({ query: 'a' }),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });
    });
  });

  describe('DELETE /api/friends/search/recent/:query', () => {
    describe('when the search exists', () => {
      it('deletes a specific recent search', async () => {
        const { app, testUser } = getContext();

        for (const query of ['alice', 'bob', 'charlie']) {
          await app.fetch(
            new Request('http://localhost/api/friends/search/recent', {
              method: 'POST',
              headers: authHeaders(testUser.sessionCookies),
              body: JSON.stringify({ query }),
            }),
          );
        }

        const deleteResponse = await app.fetch(
          new Request('http://localhost/api/friends/search/recent/bob', {
            method: 'DELETE',
            headers: authHeaders(testUser.sessionCookies),
          }),
        );

        expect(deleteResponse.status).toBe(200);

        const getResponse = await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          }),
        );
        const body = parseWith(RecentSearchesResponseSchema, await getResponse.json());

        expect(body.length).toBe(2);
        expect(body).not.toContain('bob');
        expect(body).toContain('alice');
        expect(body).toContain('charlie');
      });
    });

    describe('when the search does not exist', () => {
      it('returns 404 for non-existent search', async () => {
        const { app, testUser } = getContext();

        const response = await app.fetch(
          new Request('http://localhost/api/friends/search/recent/nonexistent', {
            method: 'DELETE',
            headers: authHeaders(testUser.sessionCookies),
          }),
        );

        expect(response.status).toBe(404);
      });
    });
  });

  describe('DELETE /api/friends/search/recent', () => {
    describe('when searches were stored', () => {
      it('clears all recent searches', async () => {
        const { app, testUser } = getContext();

        for (const query of ['alice', 'bob', 'charlie']) {
          await app.fetch(
            new Request('http://localhost/api/friends/search/recent', {
              method: 'POST',
              headers: authHeaders(testUser.sessionCookies),
              body: JSON.stringify({ query }),
            }),
          );
        }

        const clearResponse = await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'DELETE',
            headers: authHeaders(testUser.sessionCookies),
          }),
        );

        expect(clearResponse.status).toBe(200);

        const getResponse = await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          }),
        );
        const body = parseWith(RecentSearchesResponseSchema, await getResponse.json());

        expect(body.length).toBe(0);
      });
    });
  });

  describe('GET /api/friends/search', () => {
    describe('with a valid query', () => {
      it('returns matching friends for autocomplete', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Smith');
        await createTestFriend(pool, testUser.externalId, 'Alice Johnson');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');

        const request = new Request('http://localhost/api/friends/search?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.sessionCookies),
        });

        const response = await app.fetch(request);
        const body = parseWith(FriendSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(2);
        expect(body[0]).toHaveProperty('id');
        expect(body[0]).toHaveProperty('displayName');
      });

      it('omits the friend named in the exclude parameter', async () => {
        const { app, pool, testUser } = getContext();

        const friend1 = await createTestFriend(pool, testUser.externalId, 'Alice Smith');
        await createTestFriend(pool, testUser.externalId, 'Alice Johnson');

        const request = new Request(
          `http://localhost/api/friends/search?q=alice&exclude=${friend1}`,
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);
        const body = parseWith(FriendSearchResultResponseSchema.array(), await response.json());

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0]?.displayName).toBe('Alice Johnson');
      });
    });

    describe('with an invalid exclude parameter', () => {
      it('rejects invalid exclude UUID', async () => {
        const { app, testUser } = getContext();

        const request = new Request(
          'http://localhost/api/friends/search?q=alice&exclude=invalid-uuid',
          {
            method: 'GET',
            headers: authHeaders(testUser.sessionCookies),
          },
        );

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });
    });
  });
});
