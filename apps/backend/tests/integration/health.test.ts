import { chmod, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Hono } from 'hono';
import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import healthRoutes from '../../src/routes/health.js';
import type { AppContext } from '../../src/types/context.js';
import { createLogger } from '../../src/utils/logger.js';
import { setupAuthTestSuite } from './auth.helpers.js';

describe('Health Endpoint Integration Tests', () => {
  const { getContext } = setupAuthTestSuite();

  describe('GET /health (liveness)', () => {
    it('should return 200 with status and release', async () => {
      const { app } = getContext();
      const response = await app.fetch(new Request('http://localhost/health'));
      const body = (await response.json()) as { status: string; release: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(typeof body.release).toBe('string');
      expect(body.release.length).toBeGreaterThan(0);
    });

    it('should not report uptime or database state any more', async () => {
      const { app } = getContext();
      const response = await app.fetch(new Request('http://localhost/health'));
      const body = (await response.json()) as Record<string, unknown>;

      expect(Object.keys(body).sort()).toEqual(['release', 'status']);
    });

    it('should not touch the database', async () => {
      const { app, pool } = getContext();
      const connect = vi.spyOn(pool, 'connect');

      const response = await app.fetch(new Request('http://localhost/health'));

      expect(response.status).toBe(200);
      expect(connect).not.toHaveBeenCalled();
      connect.mockRestore();
    });
  });

  describe('GET /health/ready (readiness)', () => {
    // The repo's own apps/backend/uploads is created by the dev container and
    // owned by root, so the check has to run against a directory this process
    // controls. UPLOAD_DIR is what the photo service reads.
    let uploadDir: string;

    beforeEach(async () => {
      uploadDir = await mkdtemp(path.join(tmpdir(), 'fb-health-uploads-'));
      vi.stubEnv('UPLOAD_DIR', uploadDir);
    });

    afterEach(async () => {
      await chmod(uploadDir, 0o700).catch(() => undefined);
      await rm(uploadDir, { recursive: true, force: true });
    });

    it('should report every dependency healthy', async () => {
      const { app } = getContext();
      const response = await app.fetch(new Request('http://localhost/health/ready'));
      const body = (await response.json()) as {
        status: string;
        checks: { db: boolean; authDb: boolean; uploads: boolean };
        signupEnabled: boolean;
        emailEnabled: boolean;
      };

      // Assert the individual checks first: a failure then names the broken
      // dependency instead of just reporting 503.
      expect(body.checks).toEqual({ db: true, authDb: true, uploads: true });
      expect(response.status).toBe(200);
      expect(body.status).toBe('ready');
      // No DISABLE_SIGNUP / SMTP_HOST in the test environment.
      expect(body.signupEnabled).toBe(true);
      expect(body.emailEnabled).toBe(false);
    });

    it('should return 503 when the uploads directory is not writable', async () => {
      const { app } = getContext();
      // Read+execute only: the photo service could not create a friend
      // directory here, which is exactly the read-only-mount case.
      await chmod(uploadDir, 0o500);

      const response = await app.fetch(new Request('http://localhost/health/ready'));
      const body = (await response.json()) as {
        status: string;
        checks: { db: boolean; authDb: boolean; uploads: boolean };
      };

      expect(body.checks).toEqual({ db: true, authDb: true, uploads: false });
      expect(response.status).toBe(503);
      expect(body.status).toBe('not_ready');
    });

    it('should return 503 and mark the failing check when the main pool is down', async () => {
      // A dedicated app over an unreachable pool: the suite's own pool must
      // stay usable for the remaining tests and for teardown.
      const failingPool = new pg.Pool({
        connectionString: 'postgresql://invalid:5432/invalid',
        connectionTimeoutMillis: 1000,
      });
      failingPool.on('error', () => {
        // Expected while the pool fails to connect.
      });
      const logger = createLogger();
      const failingApp = new Hono<AppContext>();
      failingApp.use('*', async (c, next) => {
        c.set('db', failingPool);
        c.set('logger', logger);
        await next();
      });
      failingApp.route('/health', healthRoutes);

      const response = await failingApp.fetch(new Request('http://localhost/health/ready'));
      const body = (await response.json()) as {
        status: string;
        checks: { db: boolean; authDb: boolean };
      };

      expect(response.status).toBe(503);
      expect(body.status).toBe('not_ready');
      expect(body.checks.db).toBe(false);
      // The auth pool is independent and still healthy.
      expect(body.checks.authDb).toBe(true);

      await failingPool.end().catch(() => {
        // Ignore errors from an already-failed pool.
      });
    });

    it('should keep liveness green while readiness fails', async () => {
      const failingPool = new pg.Pool({
        connectionString: 'postgresql://invalid:5432/invalid',
        connectionTimeoutMillis: 1000,
      });
      failingPool.on('error', () => {
        // Expected while the pool fails to connect.
      });
      const logger = createLogger();
      const failingApp = new Hono<AppContext>();
      failingApp.use('*', async (c, next) => {
        c.set('db', failingPool);
        c.set('logger', logger);
        await next();
      });
      failingApp.route('/health', healthRoutes);

      const response = await failingApp.fetch(new Request('http://localhost/health'));

      expect(response.status).toBe(200);
      await failingPool.end().catch(() => {
        // Ignore errors from an already-failed pool.
      });
    });
  });
});
