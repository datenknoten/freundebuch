import { AppError } from '@datenknoten/kit';

export class CircleCreationError extends AppError {
  constructor(message = 'Failed to create circle') {
    super(message);
  }
}
