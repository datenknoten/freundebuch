import { NotFoundError } from '@datenknoten/kit';

export class MembershipNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Membership', id);
  }
}
