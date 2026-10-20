import { NotFoundError } from '@datenknoten/kit';

export class AppPasswordNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('App password', id);
  }
}
