import { escapeLikePattern } from './escape-like-pattern.js';

/**
 * Create a wildcard query for ILIKE patterns.
 * Escapes special characters and wraps with % for partial matching.
 */
export function createWildcardQuery(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}
