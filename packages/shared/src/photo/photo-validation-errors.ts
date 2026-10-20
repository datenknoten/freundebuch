import { MAX_FILE_SIZE } from './photo-limits.js';
import { ALLOWED_MIME_TYPES } from './photo-mime-type.js';

/** Error codes for photo validation failures */
export type PhotoValidationErrorCode =
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_IMAGE'
  | 'NO_FILE_PROVIDED';

/** Human-readable error messages for validation failures */
export const PhotoValidationErrors: Record<PhotoValidationErrorCode, string> = {
  INVALID_FILE_TYPE: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
  FILE_TOO_LARGE: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
  INVALID_IMAGE: 'Invalid image file',
  NO_FILE_PROVIDED: 'No photo file provided',
} as const;
