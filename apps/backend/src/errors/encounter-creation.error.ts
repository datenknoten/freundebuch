import { AppError } from '@datenknoten/kit';

export class EncounterCreationError extends AppError {
  constructor(message = 'Failed to create encounter') {
    super(message);
  }
}
