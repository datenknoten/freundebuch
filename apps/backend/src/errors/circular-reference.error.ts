import { ConflictError } from '@datenknoten/kit';

export class CircularReferenceError extends ConflictError {
  constructor(message = 'Circular reference detected in circle hierarchy') {
    super(message);
  }
}
