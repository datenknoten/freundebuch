import { Hono } from 'hono';
import type { Pool } from 'pg';
import pino from 'pino';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppContext } from '../types/context.js';
import authRoutes from './auth.js';

// This is an integration test that tests the auth routes
// For a real test, you'd need a test database

describe('Auth Routes Integration Tests', () => {
  let app: Hono<AppContext>;
  let mockDb: Pool;
  let logger: pino.Logger;

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

    // Mount auth routes
    app.route('/api/auth', authRoutes);
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for invalid request body', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid',
          // missing password
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should validate password length', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short', // less than 8 characters
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for invalid request body', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          // missing password
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 if no session token provided', async () => {
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('No active session');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 400 for invalid email', async () => {
      const res = await app.request('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // missing email
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should return 400 for invalid request', async () => {
      const res = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'some-token',
          // missing password
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should validate password length', async () => {
      const res = await app.request('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'some-token',
          password: 'short',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });
});
