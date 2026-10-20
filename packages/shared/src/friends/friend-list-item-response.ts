import { type } from 'arktype';
import { CircleSummaryResponseSchema } from '../circles/circle-summary-response.js';

export const FriendListItemResponseSchema = type({
  id: 'string',
  displayName: 'string',
  'photoThumbnailUrl?': 'string',
  'primaryEmail?': 'string',
  'primaryPhone?': 'string',
  'nickname?': 'string',
  'maidenName?': 'string',
  'organization?': 'string',
  'jobTitle?': 'string',
  'department?': 'string',
  'primaryCity?': 'string',
  'primaryCountry?': 'string',
  'birthday?': 'string',
  circles: CircleSummaryResponseSchema.array(),
  isFavorite: 'boolean',
  'archivedAt?': 'string',
  createdAt: 'string',
  updatedAt: 'string',
});

export type FriendListItemResponse = typeof FriendListItemResponseSchema.infer;
