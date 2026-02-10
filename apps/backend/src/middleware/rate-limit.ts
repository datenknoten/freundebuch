import type { Context, Next } from 'hono';
import { RateLimiterMemory, type RateLimiterRes } from 'rate-limiter-flexible';

// Use higher limits in test environment to allow concurrent operation tests
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

// Rate limiter for authentication endpoints (login, register)
// 5 attempts per minute in production, 100 in test
let authLimiter = new RateLimiterMemory({
  points: isTestEnv ? 100 : 5,
  duration: 60,
  blockDuration: isTestEnv ? 1 : 300,
});

// Rate limiter for password reset endpoints
// 3 attempts per hour in production, 100 in test
let passwordResetLimiter = new RateLimiterMemory({
  points: isTestEnv ? 100 : 3,
  duration: 3600,
  blockDuration: isTestEnv ? 1 : 3600,
});

// Rate limiter for friends API endpoints
// 100 requests per minute in production, 500 in test
let friendsLimiter = new RateLimiterMemory({
  points: isTestEnv ? 500 : 100,
  duration: 60,
  blockDuration: isTestEnv ? 1 : 60,
});

// Rate limiter for circles API endpoints
// 60 requests per minute in production, 300 in test
let circlesLimiter = new RateLimiterMemory({
  points: isTestEnv ? 300 : 60,
  duration: 60,
  blockDuration: isTestEnv ? 1 : 60,
});

// Rate limiter for encounters API endpoints
// 60 requests per minute in production, 300 in test
let encountersLimiter = new RateLimiterMemory({
  points: isTestEnv ? 300 : 60,
  duration: 60,
  blockDuration: isTestEnv ? 1 : 60,
});

// Rate limiter for collectives API endpoints
// 60 requests per minute in production, 300 in test
let collectivesLimiter = new RateLimiterMemory({
  points: isTestEnv ? 300 : 60,
  duration: 60,
  blockDuration: isTestEnv ? 1 : 60,
});

/**
 * Reset all rate limiters (for testing purposes)
 */
export function resetRateLimiters(): void {
  authLimiter = new RateLimiterMemory({
    points: isTestEnv ? 100 : 5,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 300,
  });
  passwordResetLimiter = new RateLimiterMemory({
    points: isTestEnv ? 100 : 3,
    duration: 3600,
    blockDuration: isTestEnv ? 1 : 3600,
  });
  friendsLimiter = new RateLimiterMemory({
    points: isTestEnv ? 500 : 100,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 60,
  });
  circlesLimiter = new RateLimiterMemory({
    points: isTestEnv ? 300 : 60,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 60,
  });
  encountersLimiter = new RateLimiterMemory({
    points: isTestEnv ? 300 : 60,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 60,
  });
  collectivesLimiter = new RateLimiterMemory({
    points: isTestEnv ? 300 : 60,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 60,
  });
}

/**
 * Get client identifier from request headers
 * Uses X-Forwarded-For if behind proxy, otherwise X-Real-IP
 */
function getClientIdentifier(c: Context): string {
  const forwarded = c.req.header('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return c.req.header('X-Real-IP') || 'unknown';
}

/**
 * Rate limiting middleware for authentication endpoints
 * Limits: 5 attempts per minute, 5 minute block after exceeding
 */
export async function authRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);
  const logger = c.get('logger');

  try {
    await authLimiter.consume(clientId);
    return next();
  } catch (error) {
    const rateLimiterRes = error as RateLimiterRes;
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

    logger.warn({ clientId, retryAfter }, 'Rate limit exceeded on auth endpoint');

    return c.json({ error: 'Too many requests. Please try again later.' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }
}

/**
 * Rate limiting middleware for password reset endpoints
 * Limits: 3 attempts per hour, 1 hour block after exceeding
 */
export async function passwordResetRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);
  const logger = c.get('logger');

  try {
    await passwordResetLimiter.consume(clientId);
    return next();
  } catch (error) {
    const rateLimiterRes = error as RateLimiterRes;
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

    logger.warn({ clientId, retryAfter }, 'Rate limit exceeded on password reset endpoint');

    return c.json({ error: 'Too many password reset attempts. Please try again later.' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }
}

/**
 * Rate limiting middleware for friends API endpoints
 * Limits: 100 requests per minute, 1 minute block after exceeding
 */
export async function friendsRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);
  const logger = c.get('logger');

  try {
    await friendsLimiter.consume(clientId);
    return next();
  } catch (error) {
    const rateLimiterRes = error as RateLimiterRes;
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

    logger.warn({ clientId, retryAfter }, 'Rate limit exceeded on friends endpoint');

    return c.json({ error: 'Too many requests. Please try again later.' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }
}

/**
 * Rate limiting middleware for circles API endpoints
 * Limits: 60 requests per minute, 1 minute block after exceeding
 */
export async function circlesRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);
  const logger = c.get('logger');

  try {
    await circlesLimiter.consume(clientId);
    return next();
  } catch (error) {
    const rateLimiterRes = error as RateLimiterRes;
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

    logger.warn({ clientId, retryAfter }, 'Rate limit exceeded on circles endpoint');

    return c.json({ error: 'Too many requests. Please try again later.' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }
}

/**
 * Rate limiting middleware for encounters API endpoints
 * Limits: 60 requests per minute, 1 minute block after exceeding
 */
export async function encountersRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);
  const logger = c.get('logger');

  try {
    await encountersLimiter.consume(clientId);
    return next();
  } catch (error) {
    const rateLimiterRes = error as RateLimiterRes;
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

    logger.warn({ clientId, retryAfter }, 'Rate limit exceeded on encounters endpoint');

    return c.json({ error: 'Too many requests. Please try again later.' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }
}

/**
 * Rate limiting middleware for collectives API endpoints
 * Limits: 60 requests per minute, 1 minute block after exceeding
 */
export async function collectivesRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);
  const logger = c.get('logger');

  try {
    await collectivesLimiter.consume(clientId);
    return next();
  } catch (error) {
    const rateLimiterRes = error as RateLimiterRes;
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

    logger.warn({ clientId, retryAfter }, 'Rate limit exceeded on collectives endpoint');

    return c.json({ error: 'Too many requests. Please try again later.' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }
}
