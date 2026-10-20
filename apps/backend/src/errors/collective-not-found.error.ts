import { NotFoundError } from '@datenknoten/kit';

export class CollectiveNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Collective', id);
  }
}
