import { NotFoundError } from '@datenknoten/kit';

export class NotificationChannelNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Notification channel', id);
  }
}
