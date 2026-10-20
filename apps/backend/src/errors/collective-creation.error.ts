import { AppError } from '@datenknoten/kit';

export class CollectiveCreationError extends AppError {
  constructor(message = 'Failed to create collective') {
    super(message);
  }
}
