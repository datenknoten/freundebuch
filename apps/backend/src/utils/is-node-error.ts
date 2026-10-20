/** Checks whether an unknown error is a Node.js ErrnoException */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
