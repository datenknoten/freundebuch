import { ConflictError } from '@datenknoten/kit';

export class NotificationChannelAlreadyExistsError extends ConflictError {
  constructor(platform: string) {
    super(`A ${platform} notification channel already exists for this user`);
  }
}
