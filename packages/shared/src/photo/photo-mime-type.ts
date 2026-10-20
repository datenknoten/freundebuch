import { type } from 'arktype';

/**
 * Photo upload types and validation schemas
 */

// ============================================================================
// Constants
// ============================================================================

/** Allowed MIME types for photo uploads */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Schema for validating photo MIME types */
export const PhotoMimeTypeSchema = type('"image/jpeg" | "image/png" | "image/webp"');

export type PhotoMimeType = typeof PhotoMimeTypeSchema.infer;
