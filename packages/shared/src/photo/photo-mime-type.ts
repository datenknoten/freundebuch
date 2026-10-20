import { type } from 'arktype';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const PhotoMimeTypeSchema = type.enumerated(...ALLOWED_MIME_TYPES);

export type PhotoMimeType = (typeof ALLOWED_MIME_TYPES)[number];
