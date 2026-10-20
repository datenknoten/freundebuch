import { NotFoundError } from '@datenknoten/kit';

export class RoleNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Role', id);
  }
}
