import { AppError } from '@datenknoten/kit';

export class AppPasswordCreationError extends AppError {
  constructor(message = 'Failed to create app password') {
    super(message);
  }
}
