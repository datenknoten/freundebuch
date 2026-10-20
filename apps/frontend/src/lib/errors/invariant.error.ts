import { AppError } from '@datenknoten/kit';

/** A condition the code relies on does not hold: a programming error, not a user error. */
export class InvariantError extends AppError {
  public constructor(message: string) {
    super(message, { code: 'INVARIANT_VIOLATED' });
  }
}
