import type { RateLimiterRes } from 'rate-limiter-flexible';

export function isRateLimiterRes(error: unknown): error is RateLimiterRes {
  return (
    typeof error === 'object' &&
    error !== null &&
    'msBeforeNext' in error &&
    typeof error.msBeforeNext === 'number'
  );
}
