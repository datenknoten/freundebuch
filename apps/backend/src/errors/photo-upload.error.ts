import { ValidationError } from '@datenknoten/kit';

export class PhotoUploadError extends ValidationError {
  public override readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}
