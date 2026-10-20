import { type } from 'arktype';

export const NetworkGraphNodeResponseSchema = type({
  id: 'string',
  displayName: 'string',
  'photoThumbnailUrl?': 'string',
  isFavorite: 'boolean',
});

export type NetworkGraphNodeResponse = typeof NetworkGraphNodeResponseSchema.infer;
