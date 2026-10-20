import { ConflictError } from '@datenknoten/kit';

export class BirthdayAlreadyExistsError extends ConflictError {
  constructor(message = 'Friend already has a birthday date') {
    super(message);
  }
}
