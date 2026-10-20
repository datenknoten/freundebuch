import { type } from 'arktype';
import { MAX_FILE_SIZE } from './photo-limits.js';
import { PhotoMimeTypeSchema } from './photo-mime-type.js';

export const PhotoUploadMetadataSchema = type({
  mimeType: PhotoMimeTypeSchema,
  size: `number <= ${MAX_FILE_SIZE}`,
  fileName: 'string > 0',
});

export type PhotoUploadMetadata = typeof PhotoUploadMetadataSchema.infer;
