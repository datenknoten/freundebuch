import { AppError } from '@datenknoten/kit';

export class DatabaseConnectionError extends AppError {
  constructor(message = 'No database connection') {
    super(message);
  }
}
