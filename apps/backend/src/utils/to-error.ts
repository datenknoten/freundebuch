import { UnknownValueError } from '../errors/unknown-value.error.js';

export function toError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }
  return new UnknownValueError(error);
}
