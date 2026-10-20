import type { UrlInput } from '@freundebuch/shared/index.js';
import type { UrlData } from '../../services/friends/sub-resources/url.service.js';

export function mapUrlInput(input: UrlInput) {
  return {
    url: input.url,
    urlType: input.url_type,
    label: input.label,
  } satisfies UrlData;
}
