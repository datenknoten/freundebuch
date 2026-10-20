import type { UrlType } from './url-type.js';

/** URL/website in API responses */
export interface Url {
  id: string;
  url: string;
  urlType: UrlType;
  label?: string;
  createdAt: string;
}
