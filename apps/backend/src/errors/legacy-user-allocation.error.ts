import { AppError } from '@datenknoten/kit';

export class LegacyUserAllocationError extends AppError {
  constructor() {
    super('Failed to allocate legacy user row');
  }
}
