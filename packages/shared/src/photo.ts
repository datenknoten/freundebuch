import { type } from 'arktype';

/**
 * Photo upload types and validation schemas
 */

// ============================================================================
// Constants
// ============================================================================

/** Allowed MIME types for photo uploads */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Maximum file size in bytes (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Thumbnail size in pixels */
export const THUMBNAIL_SIZE = 200;

// ============================================================================
// Validation Schemas
// ============================================================================

/** Schema for validating photo MIME types */
export const PhotoMimeTypeSchema = type('"image/jpeg" | "image/png" | "image/webp"');
export type PhotoMimeType = typeof PhotoMimeTypeSchema.infer;

/** Schema for validating photo upload metadata before processing */
export const PhotoUploadMetadataSchema = type({
  mimeType: PhotoMimeTypeSchema,
  size: `number <= ${MAX_FILE_SIZE}`,
  fileName: 'string > 0',
});
export type PhotoUploadMetadata = typeof PhotoUploadMetadataSchema.infer;

// ============================================================================
// Error Handling
// ============================================================================

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

// ============================================================================
// Response Interfaces
// ============================================================================

/** Result returned after successful photo upload */
export interface PhotoUploadResult {
  photoUrl: string;
  photoThumbnailUrl: string;
}
