import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  friendsRateLimitMiddleware,
  resetRateLimiters,
  sentryTunnelRateLimitMiddleware,
} from '../../src/middleware/rate-limit.js';
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

  /**
   * X-Forwarded-For is client-controlled. If it were honoured unconditionally,
   * or if the *leftmost* hop were taken, an attacker could mint a fresh bucket
   * per request by varying the header and the limiter would stop limiting.
   *
   * The sentry-tunnel limiter is the unauthenticated one, so its key is always
   * the client identifier - which is exactly what these assertions probe.
   */
  describe('client identifier', () => {
    function tunnelApp(): Hono<AppContext> {
      const app = new Hono<AppContext>();
      app.use('*', async (c, next) => {
        // biome-ignore lint/suspicious/noExplicitAny: minimal logger stand-in for the middleware
        c.set('logger', silentLogger as any);
        return next();
      });
      app.use('*', sentryTunnelRateLimitMiddleware);
      app.get('/', (c) => c.json({ ok: true }));
      return app;
    }

    async function drainWith(
      app: Hono<AppContext>,
      headers: Record<string, string>,
      attempts: number,
    ): Promise<number> {
      let lastStatus = 0;
      for (let i = 0; i < attempts; i++) {
        lastStatus = (await app.request('/', { headers })).status;
        if (lastStatus === 429) break;
      }
      return lastStatus;
    }

    it('ignores X-Forwarded-For when TRUST_PROXY is off', async () => {
      vi.stubEnv('TRUST_PROXY', 'false');
      resetConfig();
      const app = tunnelApp();

      expect(await drainWith(app, { 'X-Forwarded-For': '10.0.0.1' }, 400)).toBe(429);

      // A different spoofed header must NOT buy a fresh bucket.
      const spoofed = await app.request('/', { headers: { 'X-Forwarded-For': '10.0.0.99' } });
      expect(spoofed.status).toBe(429);
    });

    it('keys by the last X-Forwarded-For hop when TRUST_PROXY is on', async () => {
      vi.stubEnv('TRUST_PROXY', 'true');
      resetConfig();
      const app = tunnelApp();

      // The trusted proxy appends the real peer as the last hop; everything to
      // its left is whatever the client chose to send.
      expect(await drainWith(app, { 'X-Forwarded-For': 'spoofed, 203.0.113.7' }, 400)).toBe(429);

      // Same real hop, different client-supplied prefix: still the same bucket.
      const sameHop = await app.request('/', {
        headers: { 'X-Forwarded-For': 'something-else, 203.0.113.7' },
      });
      expect(sameHop.status).toBe(429);

      // A genuinely different last hop is a different client.
      const otherHop = await app.request('/', {
        headers: { 'X-Forwarded-For': 'spoofed, 203.0.113.8' },
      });
      expect(otherHop.status).toBe(200);
    });

    it('falls back to X-Real-IP when TRUST_PROXY is on and no forwarded chain exists', async () => {
      vi.stubEnv('TRUST_PROXY', 'true');
      resetConfig();
      const app = tunnelApp();

      expect(await drainWith(app, { 'X-Real-IP': '198.51.100.4' }, 400)).toBe(429);

      const otherClient = await app.request('/', { headers: { 'X-Real-IP': '198.51.100.5' } });
      expect(otherClient.status).toBe(200);
    });
  });
});
