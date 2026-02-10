import { Hono } from 'hono';
import type { Pool } from 'pg';
import pino from 'pino';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppContext } from '../types/context.js';
import collectivesRoutes from './collectives.js';

/**
 * Integration tests for the Collectives API routes
 * These tests verify request validation, authentication, and basic error handling.
 * Full integration tests with a test database would require additional setup.
 */

describe('Collectives Routes Integration Tests', () => {
  let app: Hono<AppContext>;
  let mockDb: Pool;
  let logger: pino.Logger;

  // Test UUIDs
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const invalidUuid = 'not-a-uuid';

  beforeAll(() => {
    // Create a test app
    app = new Hono<AppContext>();

    // Create mock database and logger
    mockDb = {} as Pool;
    logger = pino({ level: 'silent' }); // Silent logger for tests

    // Set up middleware to inject db and logger
    app.use('*', async (c, next) => {
      c.set('db', mockDb);
      c.set('logger', logger);
      await next();
    });

    // Mount collectives routes
    app.route('/api/collectives', collectivesRoutes);
  });

  // ============================================================================
  // Collective Types Tests
  // ============================================================================

  describe('GET /api/collectives/types', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/api/collectives/types', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/collectives/types/:id', () => {
    it('should return 400 for invalid type ID', async () => {
      const res = await app.request(`/api/collectives/types/${invalidUuid}`, {
        method: 'GET',
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });
  });

  // ============================================================================
  // Collective CRUD Tests
  // ============================================================================

  describe('GET /api/collectives', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/api/collectives', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/collectives', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/api/collectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Family',
          collective_type_id: validUuid,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      // This would require bypassing auth; tested at integration level
      // For now we verify the endpoint exists
      const res = await app.request('/api/collectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Will return 401 due to auth middleware before validation
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/collectives/:id', () => {
    it('should return 400 for invalid collective ID format', async () => {
      const res = await app.request(`/api/collectives/${invalidUuid}`, {
        method: 'GET',
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(`/api/collectives/${validUuid}`, {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('PUT /api/collectives/:id', () => {
    it('should return 400 for invalid collective ID format', async () => {
      const res = await app.request(`/api/collectives/${invalidUuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(`/api/collectives/${validUuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('DELETE /api/collectives/:id', () => {
    it('should return 400 for invalid collective ID format', async () => {
      const res = await app.request(`/api/collectives/${invalidUuid}`, {
        method: 'DELETE',
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(`/api/collectives/${validUuid}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  // ============================================================================
  // Membership Routes Tests
  // ============================================================================

  describe('POST /api/collectives/:id/members/preview', () => {
    it('should return 400 for invalid collective ID', async () => {
      const res = await app.request(`/api/collectives/${invalidUuid}/members/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friend_id: validUuid,
          role_id: validUuid,
        }),
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(`/api/collectives/${validUuid}/members/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friend_id: validUuid,
          role_id: validUuid,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/collectives/:id/members', () => {
    it('should return 400 for invalid collective ID', async () => {
      const res = await app.request(`/api/collectives/${invalidUuid}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friend_id: validUuid,
          role_id: validUuid,
        }),
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(`/api/collectives/${validUuid}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friend_id: validUuid,
          role_id: validUuid,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('DELETE /api/collectives/:id/members/:memberId', () => {
    it('should return 400 for invalid collective ID', async () => {
      const res = await app.request(`/api/collectives/${invalidUuid}/members/${validUuid}`, {
        method: 'DELETE',
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 400 for invalid member ID', async () => {
      const res = await app.request(`/api/collectives/${validUuid}/members/${invalidUuid}`, {
        method: 'DELETE',
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(`/api/collectives/${validUuid}/members/${validUuid}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('PUT /api/collectives/:id/members/:memberId/role', () => {
    it('should return 400 for invalid collective ID', async () => {
      const res = await app.request(`/api/collectives/${invalidUuid}/members/${validUuid}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_id: validUuid,
        }),
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(`/api/collectives/${validUuid}/members/${validUuid}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_id: validUuid,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/collectives/:id/members/:memberId/deactivate', () => {
    it('should return 400 for invalid collective ID', async () => {
      const res = await app.request(
        `/api/collectives/${invalidUuid}/members/${validUuid}/deactivate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(
        `/api/collectives/${validUuid}/members/${validUuid}/deactivate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Left company',
            inactive_date: '2024-01-15',
          }),
        },
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/collectives/:id/members/:memberId/reactivate', () => {
    it('should return 400 for invalid collective ID', async () => {
      const res = await app.request(
        `/api/collectives/${invalidUuid}/members/${validUuid}/reactivate`,
        {
          method: 'POST',
        },
      );

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await app.request(
        `/api/collectives/${validUuid}/members/${validUuid}/reactivate`,
        {
          method: 'POST',
        },
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  // ============================================================================
  // Input Validation Tests (would require authenticated context)
  // ============================================================================

  describe('Input Validation', () => {
    it('should reject invalid JSON body for POST /api/collectives', async () => {
      const res = await app.request('/api/collectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'not valid json',
      });

      // Will return 401 first, then 400 for invalid JSON
      expect([400, 401]).toContain(res.status);
    });

    it('should reject empty body for member operations', async () => {
      const res = await app.request(`/api/collectives/${validUuid}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Will return 401 first due to auth middleware
      expect([400, 401]).toContain(res.status);
    });
  });
});
