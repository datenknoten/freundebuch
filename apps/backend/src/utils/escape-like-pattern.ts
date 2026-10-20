/**
 * Escape special characters for PostgreSQL LIKE/ILIKE patterns.
 * Prevents SQL injection by escaping %, _, and \ characters.
 */
export function escapeLikePattern(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
