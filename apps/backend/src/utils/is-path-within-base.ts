import path from 'node:path';

/**
 * Rejects directory traversal: the resolved path must not escape `basePath`
 * through ".." sequences.
 */
export function isPathWithinBase(basePath: string, ...untrustedPath: string[]) {
  const resolvedBase = path.resolve(basePath);
  const resolvedFull = path.resolve(basePath, ...untrustedPath);
  return resolvedFull.startsWith(resolvedBase + path.sep) === true || resolvedFull === resolvedBase;
}
