import { type } from 'arktype';

/** Friend embedded in dashboard and summary views */
export const FriendPreviewResponseSchema = type({
  id: 'string',
  displayName: 'string',
  'photoThumbnailUrl?': 'string',
});

export type FriendPreviewResponse = typeof FriendPreviewResponseSchema.infer;
