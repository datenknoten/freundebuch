import { AppError } from '@datenknoten/kit';

/** A component asked for the AppContext outside the tree of the root layout, which provides it. */
export class MissingAppContextError extends AppError {
  public constructor() {
    super('The AppContext is missing: only components below the root layout can read it', {
      code: 'MISSING_APP_CONTEXT',
    });
  }
}
