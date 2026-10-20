import { AppError } from '@datenknoten/kit';

/**
 * A stored value the application cannot interpret, such as an enum column outside
 * the union: a schema/code mismatch. The value stays out of the message because it
 * is user data and the message reaches the client.
 */
export class DataIntegrityError extends AppError {
  constructor(label: string) {
    super(`Unexpected ${label}`, { code: 'DATA_INTEGRITY' });
  }
}
