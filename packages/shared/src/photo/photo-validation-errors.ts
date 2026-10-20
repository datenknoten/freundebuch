import { MAX_FILE_SIZE } from './photo-limits.js';
import { ALLOWED_MIME_TYPES } from './photo-mime-type.js';

/** Human-readable messages for photo validation failures, by error code */
export const PHOTO_VALIDATION_ERRORS = {
  INVALID_FILE_TYPE: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
  FILE_TOO_LARGE: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
  INVALID_IMAGE: 'Invalid image file',
  NO_FILE_PROVIDED: 'No photo file provided',
} as const;

export type PhotoValidationErrorCode = keyof typeof PHOTO_VALIDATION_ERRORS;
