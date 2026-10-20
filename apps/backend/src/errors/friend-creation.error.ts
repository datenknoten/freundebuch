import { AppError } from '@datenknoten/kit';

export class FriendCreationError extends AppError {
  constructor(message = 'Failed to create friend') {
    super(message);
  }
}
