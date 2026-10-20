import { AppError } from '@datenknoten/kit';

export class MembershipCreationError extends AppError {
  constructor(message = 'Failed to create membership') {
    super(message);
  }
}
