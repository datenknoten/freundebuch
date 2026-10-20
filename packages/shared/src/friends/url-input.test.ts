import { describe, expect, it } from 'vitest';
import { UrlInputSchema } from './url-input.js';

describe('UrlInputSchema', () => {
  it('accepts a valid URL', () => {
    const result = UrlInputSchema({
      url: 'https://example.com',
      url_type: 'personal',
    });
    expect(result).toEqual({ url: 'https://example.com', url_type: 'personal' });
  });

  it('rejects an invalid URL', () => {
    const result = UrlInputSchema({
      url: 'not-a-url',
      url_type: 'personal',
    });
    expect(result.summary).toMatchInlineSnapshot(`"url must be a URL string (was "not-a-url")"`);
  });

  it('rejects an invalid URL type', () => {
    const result = UrlInputSchema({
      url: 'https://example.com',
      url_type: 'school',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"url_type must be "blog", "other", "personal" or "work" (was "school")"`,
    );
  });
});
