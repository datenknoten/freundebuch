import { AppError } from '@datenknoten/kit';

/** Wraps a thrown non-Error value so it can be logged with a stack. */
export class UnknownValueError extends AppError {
  public readonly originalValue: unknown;

  constructor(value: unknown) {
    super(String(value));
    this.originalValue = value;
  }
}
