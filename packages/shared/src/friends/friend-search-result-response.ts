import { type } from 'arktype';

/** Autocomplete entry. */
export const FriendSearchResultResponseSchema = type({
  id: 'string',
  displayName: 'string',
  'photoThumbnailUrl?': 'string',
});

export type FriendSearchResultResponse = typeof FriendSearchResultResponseSchema.infer;
