import { NotFoundError } from '@datenknoten/kit';

export class CircleNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Circle', id);
  }
}
