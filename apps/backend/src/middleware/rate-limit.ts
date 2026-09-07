import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, Next } from 'hono';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { AppContext } from '../types/context.js';
import { getConfig } from '../utils/config.js';
import { isRateLimiterRes } from '../utils/type-guards.js';

// Use higher limits in test environment to allow concurrent operation tests.
//
// The one place ENV and NODE_ENV are deliberately OR'd. Elsewhere they mean
// different things and are kept apart, but "am I under test" is answered by
// whichever of the three a given runner happens to set: vitest sets VITEST, CI
// sets NODE_ENV, and the app's own config uses ENV.
const isTestEnv =
  process.env.ENV === 'test' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

// Auth endpoint rate limiting is handled by Better Auth's rateLimit config
// (5 req/min window), plus an nginx `limit_req` zone in front of /api/auth/.

interface LimitSpec {
  /** Requests per minute in production. */
  points: number;
  /** Requests per minute under test, where suites fire in bursts. */
  test: number;
  /** Seconds to block after exceeding; defaults to 60. */
  blockDuration?: number;
  /**
   * Whether the bucket is keyed by user id. Authenticated routers key by user
   * so one heavy client cannot exhaust the limit for everyone behind the same
   * NAT; the limiter must therefore run *after* authMiddleware.
   */
  keyedByUser: boolean;
  /** Response message when the limit trips. */
  message?: string;
}

/**
 * Every limiter in one table. Eight near-identical `new RateLimiterMemory`
 * blocks plus a second copy of all eight inside `resetRateLimiters` meant a
 * changed limit had to be edited twice, and drift was invisible.
 *
 * Memory-backed buckets are correct for the single-instance deployment
 * (see ADR 0004); a second replica would double every limit.
 */
const LIMITS = {
  friends: { points: 100, test: 500, keyedByUser: true },
  circles: { points: 60, test: 300, keyedByUser: true },
  encounters: { points: 60, test: 300, keyedByUser: true },
  collectives: { points: 120, test: 300, keyedByUser: true },
  notificationChannels: { points: 30, test: 300, keyedByUser: true },
  passkeyList: { points: 30, test: 300, keyedByUser: true },
  notificationTest: {
    points: 3,
    test: 100,
    blockDuration: 120,
    keyedByUser: true,
    message: 'Too many test messages. Please wait before trying again.',
  },
  addressLookup: { points: 60, test: 300, keyedByUser: true },
  // Unauthenticated: there is no user to key by.
  sentryTunnel: { points: 60, test: 300, keyedByUser: false },
} as const satisfies Record<string, LimitSpec>;

type LimiterName = keyof typeof LIMITS;

function buildLimiters(): Record<LimiterName, RateLimiterMemory> {
  const entries = Object.entries(LIMITS).map(([name, spec]) => [
    name,
    new RateLimiterMemory({
      points: isTestEnv ? spec.test : spec.points,
      duration: 60,
      blockDuration: isTestEnv
        ? 1
        : (('blockDuration' in spec ? spec.blockDuration : undefined) ?? 60),
    }),
  ]);
  return Object.fromEntries(entries) as Record<LimiterName, RateLimiterMemory>;
}

let limiters = buildLimiters();

/**
 * Reset all rate limiters (for testing purposes)
 */
export function resetRateLimiters(): void {
  limiters = buildLimiters();
}

/**
 * Get the client identifier used as the rate-limit key.
 *
 * By default this is the socket peer address, which a client cannot spoof.
 * Only when TRUST_PROXY is set (i.e. a reverse proxy fronts the app) is
 * X-Forwarded-For read at all.
 *
 * Which entry is the client depends on how many proxies append to the header.
 * Each hop appends its own peer, so with N trusted proxies the client sits N
 * entries from the right: nginx alone yields "client", while Traefik in front
 * of nginx yields "client, traefik" and taking the last entry would key every
 * anonymous request to one shared address - the exact collapse TRUST_PROXY is
 * meant to prevent.
 *
 * Anything further left is client-supplied and never trusted: if the header is
 * shorter than the configured hop count, the leftmost entry is the closest
 * thing to a real address available, and a client that forges extra entries
 * only ever pushes itself further from the key it wants to spoof.
 */
function getClientIdentifier(c: Context): string {
  const config = getConfig();
  if (config.TRUST_PROXY) {
    const forwarded = c.req.header('X-Forwarded-For');
    if (forwarded) {
      const hops = forwarded
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      if (hops.length > 0) {
        const index = Math.max(0, hops.length - config.TRUSTED_PROXY_HOPS);
        return hops[index];
      }
    }
    const realIp = c.req.header('X-Real-IP');
    if (realIp) {
      return realIp;
    }
  }

  try {
    const address = getConnInfo(c).remote.address;
    if (address) {
      return address;
    }
  } catch {
    // Connection info is unavailable outside the node-server runtime
    // (e.g. the unit-test harness); fall through to 'unknown'.
  }

  return 'unknown';
}

/**
 * Build the middleware for one named limiter.
 *
 * Authenticated limiters key by `user:<id>` when the request has already been
 * authenticated, and fall back to the client address otherwise (the limiter
 * mounted before authMiddleware, or an unauthenticated request).
 */
function rateLimit(name: LimiterName) {
  const spec: LimitSpec = LIMITS[name];

  return async (c: Context<AppContext>, next: Next) => {
    const userId = spec.keyedByUser ? c.get('user')?.userId : undefined;
    const key = userId === undefined ? getClientIdentifier(c) : `user:${userId}`;

    try {
      await limiters[name].consume(key);
      return next();
    } catch (error) {
      if (!isRateLimiterRes(error)) throw error;
      const retryAfter = Math.ceil(error.msBeforeNext / 1000);
      c.get('logger').warn({ key, retryAfter }, `Rate limit exceeded on ${name} endpoint`);
      return c.json({ error: spec.message ?? 'Too many requests. Please try again later.' }, 429, {
        'Retry-After': String(retryAfter),
      });
    }
  };
}

// Exported under the names the routers already mount, so this stays a
// middleware-layer change.
export const friendsRateLimitMiddleware = rateLimit('friends');
export const circlesRateLimitMiddleware = rateLimit('circles');
export const encountersRateLimitMiddleware = rateLimit('encounters');
export const collectivesRateLimitMiddleware = rateLimit('collectives');
export const notificationChannelsRateLimitMiddleware = rateLimit('notificationChannels');
export const passkeyListRateLimitMiddleware = rateLimit('passkeyList');
export const notificationTestRateLimitMiddleware = rateLimit('notificationTest');
export const sentryTunnelRateLimitMiddleware = rateLimit('sentryTunnel');
export const addressLookupRateLimitMiddleware = rateLimit('addressLookup');
