import { type } from 'arktype';

export const PhotoUploadResponseSchema = type({
  photoUrl: 'string',
  photoThumbnailUrl: 'string',
});

export type PhotoUploadResponse = typeof PhotoUploadResponseSchema.infer;
