import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/index.js';
import { resetConfig } from '../src/utils/config.js';
import { createPool } from '../src/utils/db.js';

/**
 * Need to sikp for now as this will be reworked if a database is available
 */
describe.skip('App Creation', () => {
  beforeEach(() => {
    // Set required environment variables for tests
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret');
    resetConfig();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetConfig();
  });

  it('should create app without executing top-level code', () => {
    const pool = createPool();
    const app = createApp(pool);
    expect(app).toBeDefined();
  });

  it('should have health route registered', async () => {
    const pool = createPool();
    const app = await createApp(pool);
    const req = new Request('http://localhost/health');
    const res = await app.fetch(req);

    expect(res.status).toBe(500); // Database not connected in test
    const json = await res.json();
    expect(json).toHaveProperty('status');
  });

  it('should return 404 for unknown routes', async () => {
    const pool = createPool();
    const app = await createApp(pool);
    const req = new Request('http://localhost/unknown');
    const res = await app.fetch(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error', 'Not Found');
  });
});
