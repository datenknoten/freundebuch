import { type } from 'arktype';
import { UrlTypeSchema } from './url-type.js';

export const UrlResponseSchema = type({
  id: 'string',
  url: 'string',
  urlType: UrlTypeSchema,
  'label?': 'string',
  createdAt: 'string',
});

export type UrlResponse = typeof UrlResponseSchema.infer;
