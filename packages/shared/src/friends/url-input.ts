import { type } from 'arktype';
import { UrlTypeSchema } from './url-type.js';

/** Schema for creating/updating a URL */
export const UrlInputSchema = type({
  url: 'string.url',
  url_type: UrlTypeSchema,
  'label?': 'string',
});

export type UrlInput = typeof UrlInputSchema.infer;
