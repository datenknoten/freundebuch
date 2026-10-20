import { AppError } from '@datenknoten/kit';

/** The auth server refused to delete a passkey; the message is the server's reason. */
export class PasskeyDeletionError extends AppError {
  public constructor(message: string) {
    super(message, { code: 'PASSKEY_DELETION_FAILED' });
  }
}
