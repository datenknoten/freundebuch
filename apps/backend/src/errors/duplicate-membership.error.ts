import { ConflictError } from '@datenknoten/kit';

export class DuplicateMembershipError extends ConflictError {
  constructor() {
    super('Friend is already a member of this collective');
  }
}
