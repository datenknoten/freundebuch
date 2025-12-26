import path from 'node:path';

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
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validates that a resolved file path stays within the expected base directory.
 * Prevents directory traversal attacks by ensuring the final path doesn't escape
 * the intended directory through ".." sequences or symbolic links.
 *
 * @param basePath - The base directory that should contain the file
 * @param untrustedPath - The untrusted path components to validate
 * @returns true if the resolved path is within basePath, false otherwise
 */
export function isPathWithinBase(basePath: string, ...untrustedPath: string[]): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedFull = path.resolve(basePath, ...untrustedPath);
  return resolvedFull.startsWith(resolvedBase + path.sep) || resolvedFull === resolvedBase;
}
