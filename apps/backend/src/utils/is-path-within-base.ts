import path from 'node:path';

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
