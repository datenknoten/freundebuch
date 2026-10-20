import { toError } from './to-error.js';

const WRAPPER_FILES = ['/wrap-client.js', '/wrap-client.ts', '/create-pool.js', '/create-pool.ts'];

/** Async pg errors lose the application stack; this appends the call site's frames. */
export function enhanceErrorWithStack(error: unknown, callSiteStack: string) {
  const err = toError(error);
  const originalStack = err.stack ?? '';
  const callSiteFrames = callSiteStack
    .split('\n')
    .slice(1) // Remove the "Error" line
    .filter(isApplicationFrame)
    .join('\n');

  err.stack = `${originalStack}\n    --- Query initiated from ---\n${callSiteFrames}`;
  return err;
}

function isApplicationFrame(line: string) {
  return WRAPPER_FILES.some((file) => line.includes(file)) === false;
}
