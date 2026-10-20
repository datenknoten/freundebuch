import type { UrlInputSchema, UrlType } from '$shared';

/** camelCase companion of `UrlInputSchema`, shared by the friend and collective URL endpoints. */
export interface UrlData {
  url: string;
  urlType: UrlType;
  label?: string;
}

export function mapUrlInput(data: UrlData) {
  return {
    url: data.url,
    url_type: data.urlType,
    label: data.label,
  } satisfies typeof UrlInputSchema.inferIn;
}
