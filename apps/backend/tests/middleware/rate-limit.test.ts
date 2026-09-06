import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { friendsRateLimitMiddleware, resetRateLimiters } from '../../src/middleware/rate-limit.js';
import type { AppContext } from '../../src/types/context.js';
import { resetConfig } from '../../src/utils/config.js';

/**
 * The point of keying authenticated limiters by user: everyone behind one NAT
 * (a household, an office, a mobile carrier) previously shared a single bucket,
 * so one heavy client locked out the rest.
 */
describe('rate limiting', () => {
  const silentLogger = {
    warn: () => undefined,
    info: () => undefined,
    debug: () => undefined,
    error: () => undefined,
  };

  function appFor(userId: string | undefined): Hono<AppContext> {
    const app = new Hono<AppContext>();
    app.use('*', async (c, next) => {
      // biome-ignore lint/suspicious/noExplicitAny: minimal logger stand-in for the middleware
      c.set('logger', silentLogger as any);
      if (userId !== undefined) {
        c.set('user', { userId, email: `${userId}@example.com` });
      }
      return next();
    });
    app.use('*', friendsRateLimitMiddleware);
    app.get('/', (c) => c.json({ ok: true }));
    return app;
  }

  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    resetConfig();
    resetRateLimiters();
  });

  async function drain(app: Hono<AppContext>, attempts: number): Promise<number> {
    let lastStatus = 0;
    for (let i = 0; i < attempts; i++) {
      lastStatus = (await app.request('/')).status;
      if (lastStatus === 429) break;
    }
    return lastStatus;
  }

  it('does not throttle a second user when the first exhausts the limit', async () => {
    const userA = appFor('user-a');
    const userB = appFor('user-b');

    // The test-env budget is 500/min; drain it for user A.
    expect(await drain(userA, 600)).toBe(429);

    // User B has an untouched bucket.
    const responseB = await userB.request('/');
    expect(responseB.status).toBe(200);
  });

  it('falls back to the client address when there is no authenticated user', async () => {
    const anonymous = appFor(undefined);

    // No user in context: the middleware must still work rather than throw.
    const response = await anonymous.request('/');
    expect(response.status).toBe(200);
  });

  it('sends Retry-After when the limit trips', async () => {
    const app = appFor('user-retry');

    expect(await drain(app, 600)).toBe(429);

    const blocked = await app.request('/');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(await blocked.json()).toMatchObject({
      error: 'Too many requests. Please try again later.',
    });
  });
});
