import { describe, expect, it } from 'vitest';
import { SocialProfileInputSchema } from './social-profile-input.js';

describe('SocialProfileInputSchema', () => {
  describe('with valid input', () => {
    it('accepts a profile with url only', () => {
      const result = SocialProfileInputSchema({
        platform: 'github',
        profile_url: 'https://github.com/user',
      });
      expect(result).toEqual({
        platform: 'github',
        profile_url: 'https://github.com/user',
      });
    });

    it('accepts a profile with username only', () => {
      const result = SocialProfileInputSchema({
        platform: 'twitter',
        username: '@user',
      });
      expect(result).toEqual({
        platform: 'twitter',
        username: '@user',
      });
    });
  });

  describe('with neither url nor username', () => {
    it('rejects a profile with neither url nor username', () => {
      const result = SocialProfileInputSchema({
        platform: 'github',
      });
      expect(result.summary).toMatchInlineSnapshot(
        `"must be a social profile with either profile_url or username (was {"platform":"github"})"`,
      );
    });
  });

  describe('with a non-http URL', () => {
    it('rejects a profile with an invalid URL scheme', () => {
      const result = SocialProfileInputSchema({
        platform: 'github',
        profile_url: 'ftp://github.com/user',
      });
      expect(result.summary).toMatchInlineSnapshot(
        `"must be a social profile with a valid URL (must start with http:// or https://) (was {"platform":"github","profile_url":"ftp://github.com/user"})"`,
      );
    });
  });
});
