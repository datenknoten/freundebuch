import type { Context, Next } from 'hono';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { isRateLimiterRes } from '../utils/type-guards.js';

// Use higher limits in test environment to allow concurrent operation tests
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

// Auth endpoint rate limiting is handled by Better Auth's rateLimit config
// (5 req/min window). The authLimiter and passwordResetLimiter were removed
// as part of Epic 18.

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
// 120 requests per minute in production, 300 in test
let collectivesLimiter = new RateLimiterMemory({
  points: isTestEnv ? 300 : 120,
  duration: 60,
  blockDuration: isTestEnv ? 1 : 60,
});

// Rate limiter for notification channels API endpoints
// 30 requests per minute in production, 300 in test
let notificationChannelsLimiter = new RateLimiterMemory({
  points: isTestEnv ? 300 : 30,
  duration: 60,
  blockDuration: isTestEnv ? 1 : 60,
});

// Rate limiter for notification test message endpoint
// 3 attempts per minute in production, 100 in test
let notificationTestLimiter = new RateLimiterMemory({
  points: isTestEnv ? 100 : 3,
  duration: 60,
  blockDuration: isTestEnv ? 1 : 120,
});

/**
 * Reset all rate limiters (for testing purposes)
 */
export function resetRateLimiters(): void {
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
    points: isTestEnv ? 300 : 120,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 60,
  });
  notificationChannelsLimiter = new RateLimiterMemory({
    points: isTestEnv ? 300 : 30,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 60,
  });
  notificationTestLimiter = new RateLimiterMemory({
    points: isTestEnv ? 100 : 3,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 120,
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
 * Shared handler for rate-limiter rejections.
 * Validates that the caught value is a RateLimiterRes, calculates the
 * Retry-After header, logs a warning, and returns a 429 JSON response.
 */
function handleRateLimitRejection(
  c: Context,
  error: unknown,
  logMessage: string,
  responseMessage = 'Too many requests. Please try again later.',
): Response {
  if (!isRateLimiterRes(error)) throw error;
  const retryAfter = Math.ceil(error.msBeforeNext / 1000);
  c.get('logger').warn({ clientId: getClientIdentifier(c), retryAfter }, logMessage);
  return c.json({ error: responseMessage }, 429, {
    'Retry-After': String(retryAfter),
  });
}

/**
 * Rate limiting middleware for friends API endpoints
 * Limits: 100 requests per minute, 1 minute block after exceeding
 */
export async function friendsRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);

  try {
    await friendsLimiter.consume(clientId);
    return next();
  } catch (error) {
    return handleRateLimitRejection(c, error, 'Rate limit exceeded on friends endpoint');
  }
}

/**
 * Rate limiting middleware for circles API endpoints
 * Limits: 60 requests per minute, 1 minute block after exceeding
 */
export async function circlesRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);

  try {
    await circlesLimiter.consume(clientId);
    return next();
  } catch (error) {
    return handleRateLimitRejection(c, error, 'Rate limit exceeded on circles endpoint');
  }
}

/**
 * Rate limiting middleware for encounters API endpoints
 * Limits: 60 requests per minute, 1 minute block after exceeding
 */
export async function encountersRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);

  try {
    await encountersLimiter.consume(clientId);
    return next();
  } catch (error) {
    return handleRateLimitRejection(c, error, 'Rate limit exceeded on encounters endpoint');
  }
}

/**
 * Rate limiting middleware for collectives API endpoints
 * Limits: 120 requests per minute, 1 minute block after exceeding
 */
export async function collectivesRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);

  try {
    await collectivesLimiter.consume(clientId);
    return next();
  } catch (error) {
    return handleRateLimitRejection(c, error, 'Rate limit exceeded on collectives endpoint');
  }
}

/**
 * Rate limiting middleware for notification channels API endpoints
 * Limits: 30 requests per minute, 1 minute block after exceeding
 */
export async function notificationChannelsRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);

  try {
    await notificationChannelsLimiter.consume(clientId);
    return next();
  } catch (error) {
    return handleRateLimitRejection(
      c,
      error,
      'Rate limit exceeded on notification channels endpoint',
    );
  }
}

/**
 * Rate limiting middleware for notification test message endpoint
 * Limits: 3 attempts per minute, 2 minute block after exceeding
 */
export async function notificationTestRateLimitMiddleware(c: Context, next: Next) {
  const clientId = getClientIdentifier(c);

  try {
    await notificationTestLimiter.consume(clientId);
    return next();
  } catch (error) {
    return handleRateLimitRejection(
      c,
      error,
      'Rate limit exceeded on notification test endpoint',
      'Too many test messages. Please wait before trying again.',
    );
  }
}
