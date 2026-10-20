/**
 * UUID regex pattern for validation (accepts any UUID version)
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx where x is a hex digit
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID format.
 * This provides defense-in-depth against path traversal attacks
 * when UUIDs are used in file paths.
 */
export function isValidUuid(value: string) {
  return UUID_REGEX.test(value);
}
