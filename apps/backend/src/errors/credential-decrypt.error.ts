import { AppError } from '@datenknoten/kit';

export class CredentialDecryptError extends AppError {
  constructor(message: string) {
    super(message, { code: 'CREDENTIAL_DECRYPT_FAILED' });
  }
}
