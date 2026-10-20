import type { RateLimiterRes } from 'rate-limiter-flexible';

/** Checks whether an unknown error is a RateLimiterRes rejection */
export function isRateLimiterRes(error: unknown): error is RateLimiterRes {
  return (
    typeof error === 'object' &&
    error !== null &&
    'msBeforeNext' in error &&
    typeof (error as RateLimiterRes).msBeforeNext === 'number'
  );
}
