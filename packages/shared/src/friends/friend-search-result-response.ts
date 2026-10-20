import { type } from 'arktype';

/** Friend search result for autocomplete */
export const FriendSearchResultResponseSchema = type({
  id: 'string',
  displayName: 'string',
  'photoThumbnailUrl?': 'string',
});

export type FriendSearchResultResponse = typeof FriendSearchResultResponseSchema.infer;
