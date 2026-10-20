import { toError } from './to-error.js';

const WRAPPER_FILES = ['/wrap-client.js', '/wrap-client.ts', '/create-pool.js', '/create-pool.ts'];

/**
 * Enhances a database error with the original call site stack trace.
 * This fixes the issue where async pg errors lose the application stack trace.
 */
export function enhanceErrorWithStack(error: unknown, callSiteStack: string): Error {
  const err = toError(error);
  // Append the call site stack to show where the query originated
  const originalStack = err.stack ?? '';
  const callSiteFrames = callSiteStack
    .split('\n')
    .slice(1) // Remove the "Error" line
    .filter((line) => !WRAPPER_FILES.some((file) => line.includes(file))) // Remove our wrapper frames
    .join('\n');

  err.stack = `${originalStack}\n    --- Query initiated from ---\n${callSiteFrames}`;
  return err;
}
