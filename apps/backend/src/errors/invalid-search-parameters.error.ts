import { ValidationError } from '@datenknoten/kit';

export class InvalidSearchParametersError extends ValidationError {
  constructor(message = 'Invalid search parameters') {
    super(message);
  }
}
