import { AppError } from '@datenknoten/kit';

/**
 * Signals "the write matched no row" from inside a transaction so that the
 * transaction rolls back. Without it, the primary-flag clear for an unknown
 * owner or resource id gets committed and leaves the owner with zero primary
 * rows while the client still receives a 404.
 */
export class NoRowWrittenError extends AppError {
  constructor() {
    super('The write matched no row');
  }
}
