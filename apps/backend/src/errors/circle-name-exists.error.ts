import { ConflictError } from '@datenknoten/kit';

export class CircleNameExistsError extends ConflictError {
  constructor(message = 'A circle with this name already exists') {
    super(message);
  }
}
