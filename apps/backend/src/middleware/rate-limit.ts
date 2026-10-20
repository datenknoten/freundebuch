import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, MiddlewareHandler, Next } from 'hono';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Config } from '../config.js';
import type { AppContext } from '../types/context.js';
import { isRateLimiterRes } from '../utils/is-rate-limiter-res.js';

// Auth endpoint rate limiting is handled by Better Auth's rateLimit config
// (5 req/min window), plus an nginx `limit_req` zone in front of /api/auth/.

interface LimitSpec {
  /** Requests per minute. */
  points: number;
  /** Seconds to block after exceeding; defaults to 60. */
  blockDuration?: number;
  /**
   * Whether the bucket is keyed by user id. Authenticated routers key by user
   * so one heavy client cannot exhaust the limit for everyone behind the same
   * NAT; the limiter must therefore run *after* authMiddleware.
   */
  isKeyedByUser: boolean;
  /** Response message when the limit trips. */
  message?: string;
}

/**
 * Every limiter in one table, so a changed limit is edited in one place.
 *
 * Memory-backed buckets are correct for the single-instance deployment
 * (see ADR 0004); a second replica would double every limit.
 */
const LIMITS = {
  friends: { points: 100, isKeyedByUser: true },
  circles: { points: 60, isKeyedByUser: true },
  encounters: { points: 60, isKeyedByUser: true },
  collectives: { points: 120, isKeyedByUser: true },
  notificationChannels: { points: 30, isKeyedByUser: true },
  passkeyList: { points: 30, isKeyedByUser: true },
  notificationTest: {
    points: 3,
    blockDuration: 120,
    isKeyedByUser: true,
    message: 'Too many test messages. Please wait before trying again.',
  },
  addressLookup: { points: 60, isKeyedByUser: true },
  // Unauthenticated: there is no user to key by.
  sentryTunnel: { points: 60, isKeyedByUser: false },
} as const satisfies Record<string, LimitSpec>;

export type LimiterName = keyof typeof LIMITS;

export type RateLimitConfig = Pick<
  Config,
  'RATE_LIMIT_ENABLED' | 'TRUST_PROXY' | 'TRUSTED_PROXY_HOPS'
>;

export interface RateLimitMiddlewareOptions {
  config: RateLimitConfig;
  limiter: LimiterName;
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
function getClientIdentifier(
  c: Context,
  config: Pick<Config, 'TRUST_PROXY' | 'TRUSTED_PROXY_HOPS'>,
): string {
  if (config.TRUST_PROXY) {
    const forwarded = c.req.header('X-Forwarded-For');
    if (forwarded) {
      const hops = forwarded
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      const index = Math.max(0, hops.length - config.TRUSTED_PROXY_HOPS);
      const hop = hops[index];
      if (hop !== undefined) {
        return hop;
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
 * Build the middleware for one named limiter. Each call owns a fresh bucket.
 *
 * Authenticated limiters key by `user:<id>` when the request has already been
 * authenticated, and fall back to the client address otherwise (the limiter
 * mounted before authMiddleware, or an unauthenticated request).
 */
export function createRateLimitMiddleware(
  options: RateLimitMiddlewareOptions,
): MiddlewareHandler<AppContext> {
  const { config, limiter: name } = options;
  const spec: LimitSpec = LIMITS[name];
  const limiter = new RateLimiterMemory({
    points: spec.points,
    duration: 60,
    blockDuration: spec.blockDuration ?? 60,
  });

  return async function rateLimitMiddleware(c: Context<AppContext>, next: Next) {
    if (config.RATE_LIMIT_ENABLED === false) {
      return next();
    }
    const userId = spec.isKeyedByUser ? c.get('user')?.userId : undefined;
    const key = userId === undefined ? getClientIdentifier(c, config) : `user:${userId}`;

    try {
      await limiter.consume(key);
      return next();
    } catch (error) {
      if (!isRateLimiterRes(error)) throw error;
      const retryAfter = Math.ceil(error.msBeforeNext / 1000);
      c.get('logger').warn({ key, retryAfter, limiter: name }, 'Rate limit exceeded');
      return c.json({ error: spec.message ?? 'Too many requests. Please try again later.' }, 429, {
        'Retry-After': String(retryAfter),
      });
    }
  };
}
