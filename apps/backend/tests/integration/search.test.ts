import { describe, expect, it } from 'vitest';
import {
  authHeaders,
  createCircleWithFriend,
  createFriendWithAddress,
  createFriendWithEmail,
  createFriendWithFullName,
  createFriendWithMetContext,
  createFriendWithNotes,
  createFriendWithOrganization,
  createFriendWithPhone,
  createFriendWithWorkNotes,
  createTestFriend,
  setupSearchTestSuite,
} from './search.helpers.js';

describe('Search API - Integration Tests', () => {
  const { getContext } = setupSearchTestSuite();

  // ============================================================================
  // Full-Text Search: GET /api/friends/search/full
  // ============================================================================

  describe('GET /api/friends/search/full', () => {
    describe('Basic Search Functionality', () => {
      it('should return matching friends by display name', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Smith');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');
        await createTestFriend(pool, testUser.externalId, 'Alice Johnson');

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(2);
        expect(body.every((r: any) => r.displayName.toLowerCase().includes('alice'))).toBe(true);
      });

      it('should return empty array when no matches found', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Smith');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');

        const request = new Request('http://localhost/api/friends/search/full?q=xyz123', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
      });

      it('should search by first name', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithFullName(pool, testUser.externalId, 'Dr. Smith', 'John', 'Smith');
        await createTestFriend(pool, testUser.externalId, 'Jane Doe');

        const request = new Request('http://localhost/api/friends/search/full?q=john', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].displayName).toBe('Dr. Smith');
      });

      it('should search by last name', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithFullName(pool, testUser.externalId, 'John Smith', 'John', 'Smith');
        await createFriendWithFullName(pool, testUser.externalId, 'Jane Smith', 'Jane', 'Smith');
        await createTestFriend(pool, testUser.externalId, 'Bob Jones');

        const request = new Request('http://localhost/api/friends/search/full?q=smith', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(2);
        expect(body.every((r: any) => r.displayName.includes('Smith'))).toBe(true);
      });

      it('should search by organization', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice', 'Acme Corporation');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob', 'Acme Labs');
        await createFriendWithOrganization(pool, testUser.externalId, 'Charlie', 'Other Company');

        const request = new Request('http://localhost/api/friends/search/full?q=acme', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(2);
        expect(body.every((r: any) => r.organization?.toLowerCase().includes('acme'))).toBe(true);
      });

      it('should search by job title', async () => {
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
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(2);
        expect(body.every((r: any) => r.jobTitle?.toLowerCase().includes('engineer'))).toBe(true);
      });
    });

    describe('Search by Related Data', () => {
      it('should search by email address', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithEmail(pool, testUser.externalId, 'Alice', 'alice@example.com');
        await createFriendWithEmail(pool, testUser.externalId, 'Bob', 'bob@different.org');

        const request = new Request('http://localhost/api/friends/search/full?q=example.com', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].displayName).toBe('Alice');
        expect(body[0].matchSource).toBe('email');
      });

      it('should search by phone number', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithPhone(pool, testUser.externalId, 'Alice', '+14155551234');
        await createFriendWithPhone(pool, testUser.externalId, 'Bob', '+13105559999');

        const request = new Request('http://localhost/api/friends/search/full?q=415555', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].displayName).toBe('Alice');
        expect(body[0].matchSource).toBe('phone');
      });

      it('should NOT match phone numbers when query has no digits', async () => {
        const { app, pool, testUser } = getContext();

        // Create friends with phone numbers but no "patsch" anywhere
        await createFriendWithPhone(pool, testUser.externalId, 'Alice Smith', '+14155551234');
        await createFriendWithPhone(pool, testUser.externalId, 'Bob Jones', '+13105559999');
        // Create one friend that actually matches "patsch"
        await createTestFriend(pool, testUser.externalId, 'Christian Patsch');

        const request = new Request('http://localhost/api/friends/search/full?q=patsch', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        // Should only find Christian Patsch, NOT the friends with phone numbers
        expect(body.length).toBe(1);
        expect(body[0].displayName).toBe('Christian Patsch');
        expect(body[0].matchSource).toBe('friend');
        // Verify phone-only friends are NOT returned
        expect(body.some((r: any) => r.displayName === 'Alice Smith')).toBe(false);
        expect(body.some((r: any) => r.displayName === 'Bob Jones')).toBe(false);
      });

      it('should search by relationship notes', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithNotes(pool, testUser.externalId, 'Alice', 'Met at tech conference');
        await createFriendWithNotes(pool, testUser.externalId, 'Bob', 'College roommate');

        const request = new Request('http://localhost/api/friends/search/full?q=conference', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].displayName).toBe('Alice');
        expect(body[0].matchSource).toBe('notes');
      });

      it('should search by met context', async () => {
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
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].displayName).toBe('Alice');
        expect(body[0].matchSource).toBe('notes');
      });

      it('should search by work notes', async () => {
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
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].displayName).toBe('Alice');
      });
    });

    describe('Search Result Quality', () => {
      it('should only return results that match the search term', async () => {
        const { app, pool, testUser } = getContext();

        // Create friends with various names
        await createTestFriend(pool, testUser.externalId, 'Antonia Patsch');
        await createTestFriend(pool, testUser.externalId, 'Christian Patsch');
        await createTestFriend(pool, testUser.externalId, 'Anja Schumacher');
        await createTestFriend(pool, testUser.externalId, 'Christian Werner');
        await createTestFriend(pool, testUser.externalId, 'Dina Schmitt');

        const request = new Request('http://localhost/api/friends/search/full?q=patsch', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        // Should ONLY return friends whose data matches "patsch"
        expect(body.length).toBe(2);
        expect(body.every((r: any) => r.displayName.toLowerCase().includes('patsch'))).toBe(true);
        // Should NOT include Schumacher, Werner, or Schmitt
        expect(body.some((r: any) => r.displayName.includes('Schumacher'))).toBe(false);
        expect(body.some((r: any) => r.displayName.includes('Werner'))).toBe(false);
        expect(body.some((r: any) => r.displayName.includes('Schmitt'))).toBe(false);
      });

      it('should return relevance-ranked results', async () => {
        const { app, pool, testUser } = getContext();

        // Create friends with different levels of name matching
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
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBeGreaterThanOrEqual(1);
        // Name matches should have highest rank
        expect(body[0].displayName).toBe('Alice Smith');
        expect(body[0].rank).toBeGreaterThan(0);
      });

      it('should include headline with marked search terms', async () => {
        const { app, pool, testUser } = getContext();

        await createTestFriend(pool, testUser.externalId, 'Alice Smith');

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].headline).toBeDefined();
        // Headline should contain mark tags (sanitized)
        expect(body[0].headline).toMatch(/<mark>.*<\/mark>/);
      });

      it('should return primary email and phone in results', async () => {
        const { app, pool, testUser } = getContext();

        // Create friend with email - helper sets it as primary
        const friendId = await createFriendWithEmail(
          pool,
          testUser.externalId,
          'Alice Smith',
          'alice@example.com',
        );

        // Add phone to same friend
        const friendResult = await pool.query(
          'SELECT id FROM friends.friends WHERE external_id = $1',
          [friendId],
        );
        await pool.query(
          `INSERT INTO friends.friend_phones (friend_id, phone_number, phone_type, is_primary)
           VALUES ($1, '+14155551234', 'mobile', true)`,
          [friendResult.rows[0].id],
        );

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].primaryEmail).toBe('alice@example.com');
        expect(body[0].primaryPhone).toBe('+14155551234');
      });
    });

    describe('Search Limit Parameter', () => {
      it('should respect limit parameter', async () => {
        const { app, pool, testUser } = getContext();

        // Create many friends with same prefix
        for (let i = 0; i < 10; i++) {
          await createTestFriend(pool, testUser.externalId, `Alice ${i}`);
        }

        const request = new Request('http://localhost/api/friends/search/full?q=alice&limit=3', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(3);
      });

      it('should default to 10 results', async () => {
        const { app, pool, testUser } = getContext();

        // Create 15 friends with same prefix
        for (let i = 0; i < 15; i++) {
          await createTestFriend(pool, testUser.externalId, `Alice ${i}`);
        }

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(10);
      });

      it('should cap limit at 50', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=alice&limit=100', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);

        // Should not error, just cap at 50
        expect(response.status).toBe(200);
      });
    });

    describe('Validation', () => {
      it('should reject empty query', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('should reject missing query parameter', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('should reject query shorter than 2 characters', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=a', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('should require authentication', async () => {
        const { app } = getContext();

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(401);
      });
    });

    describe('User Isolation', () => {
      it('should only return friends belonging to authenticated user', async () => {
        const { app, pool, testUser } = getContext();
        const { createAuthenticatedUser } = await import('./friends.helpers.js');
        const { completeTestUserOnboarding } = await import('./auth.helpers.js');

        // Create another user with friends
        const otherUser = await createAuthenticatedUser(
          pool,
          'other-search@example.com',
          'Password123!',
        );
        await completeTestUserOnboarding(pool, otherUser.externalId);
        await createTestFriend(pool, otherUser.externalId, 'Alice Other');

        // Create friend for test user
        await createTestFriend(pool, testUser.externalId, 'Alice Mine');

        const request = new Request('http://localhost/api/friends/search/full?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].displayName).toBe('Alice Mine');
      });
    });
  });

  // ============================================================================
  // Paginated Search: GET /api/friends/search/paginated
  // ============================================================================

  describe('GET /api/friends/search/paginated', () => {
    it('should return paginated search results', async () => {
      const { app, pool, testUser } = getContext();

      // Create 15 friends
      for (let i = 0; i < 15; i++) {
        await createTestFriend(pool, testUser.externalId, `Alice ${String(i).padStart(2, '0')}`);
      }

      const request = new Request(
        'http://localhost/api/friends/search/paginated?q=alice&page=1&pageSize=5',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.results.length).toBe(5);
      expect(body.total).toBe(15);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(5);
      expect(body.totalPages).toBe(3);
    });

    it('should support sorting by display name', async () => {
      const { app, pool, testUser } = getContext();

      await createTestFriend(pool, testUser.externalId, 'Alice C');
      await createTestFriend(pool, testUser.externalId, 'Alice A');
      await createTestFriend(pool, testUser.externalId, 'Alice B');

      const request = new Request(
        'http://localhost/api/friends/search/paginated?q=alice&sortBy=display_name&sortOrder=asc',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.results[0].displayName).toBe('Alice A');
      expect(body.results[1].displayName).toBe('Alice B');
      expect(body.results[2].displayName).toBe('Alice C');
    });

    it('should support sorting by relevance', async () => {
      const { app, pool, testUser } = getContext();

      // Name with alice should rank higher
      await createTestFriend(pool, testUser.externalId, 'Alice Smith');
      await createFriendWithOrganization(pool, testUser.externalId, 'Bob Jones', 'Alice Corp');

      const request = new Request(
        'http://localhost/api/friends/search/paginated?q=alice&sortBy=relevance&sortOrder=desc',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      // Direct name match should be first
      expect(body.results[0].displayName).toBe('Alice Smith');
    });

    it('should return correct page of results', async () => {
      const { app, pool, testUser } = getContext();

      // Create 10 friends with numbers for easy sorting
      for (let i = 0; i < 10; i++) {
        await createTestFriend(pool, testUser.externalId, `Alice ${String(i).padStart(2, '0')}`);
      }

      const request = new Request(
        'http://localhost/api/friends/search/paginated?q=alice&page=2&pageSize=3&sortBy=display_name&sortOrder=asc',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.results.length).toBe(3);
      expect(body.page).toBe(2);
      // Page 2 with pageSize 3 should have items 3, 4, 5 (0-indexed: 03, 04, 05)
      expect(body.results[0].displayName).toBe('Alice 03');
      expect(body.results[1].displayName).toBe('Alice 04');
      expect(body.results[2].displayName).toBe('Alice 05');
    });
  });

  // ============================================================================
  // Faceted Search: GET /api/friends/search/faceted
  // ============================================================================

  describe('GET /api/friends/search/faceted', () => {
    describe('Search with Filters', () => {
      it('should filter by city', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithAddress(pool, testUser.externalId, 'Alice NYC', 'New York', 'USA');
        await createFriendWithAddress(pool, testUser.externalId, 'Alice LA', 'Los Angeles', 'USA');
        await createFriendWithAddress(
          pool,
          testUser.externalId,
          'Alice SF',
          'San Francisco',
          'USA',
        );

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&city=New York',
          {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.results.length).toBe(1);
        expect(body.results[0].displayName).toBe('Alice NYC');
      });

      it('should filter by country', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithAddress(pool, testUser.externalId, 'Alice USA', 'New York', 'USA');
        await createFriendWithAddress(pool, testUser.externalId, 'Alice UK', 'London', 'UK');
        await createFriendWithAddress(
          pool,
          testUser.externalId,
          'Alice Germany',
          'Berlin',
          'Germany',
        );

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&country=USA',
          {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.results.length).toBe(1);
        expect(body.results[0].displayName).toBe('Alice USA');
      });

      it('should filter by organization', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Acme', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Tech', 'Tech Inc');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Start', 'Startup LLC');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&organization=Acme Corp',
          {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.results.length).toBe(1);
        expect(body.results[0].displayName).toBe('Alice Acme');
      });

      it('should filter by job title', async () => {
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
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.results.length).toBe(1);
        expect(body.results[0].displayName).toBe('Alice Eng');
      });

      it('should filter by circle', async () => {
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
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.results.length).toBe(1);
        expect(body.results[0].displayName).toBe('Alice Circle1');
      });

      it('should combine multiple filters with AND logic', async () => {
        const { app, pool, testUser } = getContext();

        // Create friends with various attribute combinations
        const friend1Id = await createFriendWithOrganization(
          pool,
          testUser.externalId,
          'Alice Match',
          'Acme Corp',
        );
        // Add address to friend1
        const friend1Result = await pool.query(
          'SELECT id FROM friends.friends WHERE external_id = $1',
          [friend1Id],
        );
        await pool.query(
          `INSERT INTO friends.friend_addresses (friend_id, city, country, address_type, is_primary)
           VALUES ($1, 'New York', 'USA', 'home', true)`,
          [friend1Result.rows[0].id],
        );

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice OrgOnly', 'Acme Corp');

        await createFriendWithAddress(
          pool,
          testUser.externalId,
          'Alice CityOnly',
          'New York',
          'USA',
        );

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&organization=Acme Corp&city=New York',
          {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.results.length).toBe(1);
        expect(body.results[0].displayName).toBe('Alice Match');
      });
    });

    describe('Search Results Must Match Query', () => {
      it('should only return results matching both query AND filters', async () => {
        const { app, pool, testUser } = getContext();

        // Create friends: some match query, some match filter, one matches both
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Acme', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob Acme', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice Other', 'Other Corp');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&organization=Acme Corp',
          {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        // Should only return the one that matches BOTH query AND filter
        expect(body.results.length).toBe(1);
        expect(body.results[0].displayName).toBe('Alice Acme');
      });

      it('should not return results that only match filter but not query', async () => {
        const { app, pool, testUser } = getContext();

        // This tests the bug shown in the screenshot:
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
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        // Should ONLY return people with "patsch" in their searchable data
        expect(body.results.length).toBe(2);
        expect(body.results.every((r: any) => r.displayName.includes('Patsch'))).toBe(true);
        expect(body.results.some((r: any) => r.displayName.includes('Schumacher'))).toBe(false);
        expect(body.results.some((r: any) => r.displayName.includes('Werner'))).toBe(false);
      });
    });

    describe('Facet Counts', () => {
      it('should return facet counts when includeFacets=true', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice 1', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice 2', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Alice 3', 'Tech Inc');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?q=alice&includeFacets=true',
          {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.facets).toBeDefined();
        expect(body.facets.professional).toBeDefined();
        // Should have organization facets
        const orgFacet = body.facets.professional.find((f: any) => f.field === 'organization');
        expect(orgFacet).toBeDefined();
        expect(orgFacet.values.length).toBeGreaterThan(0);
      });

      it('should return circle information in results', async () => {
        const { app, pool, testUser } = getContext();

        const friendId = await createTestFriend(pool, testUser.externalId, 'Alice WithCircle');
        await createCircleWithFriend(pool, testUser.externalId, 'Friends', friendId);

        const request = new Request('http://localhost/api/friends/search/faceted?q=alice', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.results.length).toBe(1);
        expect(body.results[0].circles).toBeDefined();
        expect(body.results[0].circles.length).toBe(1);
        expect(body.results[0].circles[0].name).toBe('Friends');
      });
    });

    describe('Filter-Only Mode (No Query)', () => {
      it('should work with only filters and no search query', async () => {
        const { app, pool, testUser } = getContext();

        await createFriendWithOrganization(pool, testUser.externalId, 'Alice', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Bob', 'Acme Corp');
        await createFriendWithOrganization(pool, testUser.externalId, 'Charlie', 'Other Corp');

        const request = new Request(
          'http://localhost/api/friends/search/faceted?organization=Acme Corp',
          {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          },
        );

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.results.length).toBe(2);
        expect(body.results.every((r: any) => r.organization === 'Acme Corp')).toBe(true);
      });

      it('should reject request with no query and no filters', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/faceted', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });
    });
  });

  // ============================================================================
  // Recent Searches: /api/friends/search/recent
  // ============================================================================

  describe('Recent Searches', () => {
    describe('GET /api/friends/search/recent', () => {
      it('should return empty array when no recent searches', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/recent', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(0);
      });

      it('should return recent searches in order', async () => {
        const { app, testUser } = getContext();

        // Add searches
        for (const query of ['alice', 'bob', 'charlie']) {
          const addRequest = new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.accessToken),
            body: JSON.stringify({ query }),
          });
          await app.fetch(addRequest);
        }

        const request = new Request('http://localhost/api/friends/search/recent', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(3);
        // Most recent first
        expect(body[0]).toBe('charlie');
        expect(body[1]).toBe('bob');
        expect(body[2]).toBe('alice');
      });

      it('should respect limit parameter', async () => {
        const { app, testUser } = getContext();

        // Add 5 searches
        for (let i = 0; i < 5; i++) {
          const addRequest = new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.accessToken),
            body: JSON.stringify({ query: `search${i}` }),
          });
          await app.fetch(addRequest);
        }

        const request = new Request('http://localhost/api/friends/search/recent?limit=3', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const response = await app.fetch(request);
        const body: any = await response.json();

        expect(response.status).toBe(200);
        expect(body.length).toBe(3);
      });
    });

    describe('POST /api/friends/search/recent', () => {
      it('should add a recent search', async () => {
        const { app, testUser } = getContext();

        const addRequest = new Request('http://localhost/api/friends/search/recent', {
          method: 'POST',
          headers: authHeaders(testUser.accessToken),
          body: JSON.stringify({ query: 'test search' }),
        });

        const addResponse = await app.fetch(addRequest);

        expect(addResponse.status).toBe(201);

        // Verify it was added
        const getRequest = new Request('http://localhost/api/friends/search/recent', {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        });

        const getResponse = await app.fetch(getRequest);
        const body: any = await getResponse.json();

        expect(body).toContain('test search');
      });

      it('should update timestamp when adding duplicate search', async () => {
        const { app, testUser } = getContext();

        // Add first search
        await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.accessToken),
            body: JSON.stringify({ query: 'alice' }),
          }),
        );

        // Add second search
        await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.accessToken),
            body: JSON.stringify({ query: 'bob' }),
          }),
        );

        // Re-add first search (should move to top)
        await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'POST',
            headers: authHeaders(testUser.accessToken),
            body: JSON.stringify({ query: 'alice' }),
          }),
        );

        // Get recent searches
        const response = await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          }),
        );
        const body: any = await response.json();

        expect(body.length).toBe(2);
        expect(body[0]).toBe('alice'); // Most recent
        expect(body[1]).toBe('bob');
      });

      it('should reject empty query', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/recent', {
          method: 'POST',
          headers: authHeaders(testUser.accessToken),
          body: JSON.stringify({ query: '' }),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });

      it('should reject query shorter than 2 characters', async () => {
        const { app, testUser } = getContext();

        const request = new Request('http://localhost/api/friends/search/recent', {
          method: 'POST',
          headers: authHeaders(testUser.accessToken),
          body: JSON.stringify({ query: 'a' }),
        });

        const response = await app.fetch(request);

        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /api/friends/search/recent/:query', () => {
      it('should delete a specific recent search', async () => {
        const { app, testUser } = getContext();

        // Add searches
        for (const query of ['alice', 'bob', 'charlie']) {
          await app.fetch(
            new Request('http://localhost/api/friends/search/recent', {
              method: 'POST',
              headers: authHeaders(testUser.accessToken),
              body: JSON.stringify({ query }),
            }),
          );
        }

        // Delete one
        const deleteResponse = await app.fetch(
          new Request('http://localhost/api/friends/search/recent/bob', {
            method: 'DELETE',
            headers: authHeaders(testUser.accessToken),
          }),
        );

        expect(deleteResponse.status).toBe(200);

        // Verify it was deleted
        const getResponse = await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          }),
        );
        const body: any = await getResponse.json();

        expect(body.length).toBe(2);
        expect(body).not.toContain('bob');
        expect(body).toContain('alice');
        expect(body).toContain('charlie');
      });

      it('should return 404 for non-existent search', async () => {
        const { app, testUser } = getContext();

        const response = await app.fetch(
          new Request('http://localhost/api/friends/search/recent/nonexistent', {
            method: 'DELETE',
            headers: authHeaders(testUser.accessToken),
          }),
        );

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/friends/search/recent', () => {
      it('should clear all recent searches', async () => {
        const { app, testUser } = getContext();

        // Add searches
        for (const query of ['alice', 'bob', 'charlie']) {
          await app.fetch(
            new Request('http://localhost/api/friends/search/recent', {
              method: 'POST',
              headers: authHeaders(testUser.accessToken),
              body: JSON.stringify({ query }),
            }),
          );
        }

        // Clear all
        const clearResponse = await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'DELETE',
            headers: authHeaders(testUser.accessToken),
          }),
        );

        expect(clearResponse.status).toBe(200);

        // Verify all were deleted
        const getResponse = await app.fetch(
          new Request('http://localhost/api/friends/search/recent', {
            method: 'GET',
            headers: authHeaders(testUser.accessToken),
          }),
        );
        const body: any = await getResponse.json();

        expect(body.length).toBe(0);
      });
    });
  });

  // ============================================================================
  // Edge Cases and Special Characters
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle special characters in search query', async () => {
      const { app, pool, testUser } = getContext();

      await createTestFriend(pool, testUser.externalId, "Alice O'Brien");
      await createTestFriend(pool, testUser.externalId, 'Bob Smith');

      const request = new Request(
        `http://localhost/api/friends/search/full?q=${encodeURIComponent("O'Brien")}`,
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].displayName).toBe("Alice O'Brien");
    });

    it('should handle unicode characters in search query', async () => {
      const { app, pool, testUser } = getContext();

      await createTestFriend(pool, testUser.externalId, 'Müller Schmidt');
      await createTestFriend(pool, testUser.externalId, 'Bob Smith');

      const request = new Request(
        `http://localhost/api/friends/search/full?q=${encodeURIComponent('Müller')}`,
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].displayName).toBe('Müller Schmidt');
    });

    it('should handle whitespace-only query', async () => {
      const { app, testUser } = getContext();

      const request = new Request('http://localhost/api/friends/search/full?q=   ', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });

    it('should handle query with multiple words', async () => {
      const { app, pool, testUser } = getContext();

      await createTestFriend(pool, testUser.externalId, 'Alice Marie Smith');
      await createTestFriend(pool, testUser.externalId, 'Alice Johnson');
      await createTestFriend(pool, testUser.externalId, 'Bob Smith');

      const request = new Request('http://localhost/api/friends/search/full?q=alice smith', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      // Should find Alice Marie Smith (best match) at minimum
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('should not return deleted friends', async () => {
      const { app, pool, testUser } = getContext();

      const friendId = await createTestFriend(pool, testUser.externalId, 'Alice Deleted');
      await createTestFriend(pool, testUser.externalId, 'Alice Active');

      // Soft delete one friend
      await pool.query('UPDATE friends.friends SET deleted_at = NOW() WHERE external_id = $1', [
        friendId,
      ]);

      const request = new Request('http://localhost/api/friends/search/full?q=alice', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].displayName).toBe('Alice Active');
    });

    it('should handle very long search queries', async () => {
      const { app, testUser } = getContext();

      const longQuery = 'a'.repeat(200);

      const request = new Request(`http://localhost/api/friends/search/full?q=${longQuery}`, {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);

      // Should not crash, may return empty results
      expect(response.status).toBe(200);
    });
  });

  // ============================================================================
  // Autocomplete Search: GET /api/friends/search
  // ============================================================================

  describe('GET /api/friends/search (Autocomplete)', () => {
    it('should return matching friends for autocomplete', async () => {
      const { app, pool, testUser } = getContext();

      await createTestFriend(pool, testUser.externalId, 'Alice Smith');
      await createTestFriend(pool, testUser.externalId, 'Alice Johnson');
      await createTestFriend(pool, testUser.externalId, 'Bob Jones');

      const request = new Request('http://localhost/api/friends/search?q=alice', {
        method: 'GET',
        headers: authHeaders(testUser.accessToken),
      });

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
      // Autocomplete results have simpler structure
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('displayName');
    });

    it('should support exclude parameter', async () => {
      const { app, pool, testUser } = getContext();

      const friend1 = await createTestFriend(pool, testUser.externalId, 'Alice Smith');
      await createTestFriend(pool, testUser.externalId, 'Alice Johnson');

      const request = new Request(
        `http://localhost/api/friends/search?q=alice&exclude=${friend1}`,
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);
      const body: any = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].displayName).toBe('Alice Johnson');
    });

    it('should reject invalid exclude UUID', async () => {
      const { app, testUser } = getContext();

      const request = new Request(
        'http://localhost/api/friends/search?q=alice&exclude=invalid-uuid',
        {
          method: 'GET',
          headers: authHeaders(testUser.accessToken),
        },
      );

      const response = await app.fetch(request);

      expect(response.status).toBe(400);
    });
  });
});
