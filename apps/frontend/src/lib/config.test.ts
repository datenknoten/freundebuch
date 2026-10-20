import { ConfigurationError } from '@datenknoten/kit';
import { describe, expect, it } from 'vitest';
import { loadClientConfig } from './config.js';

describe('loadClientConfig', () => {
  describe('with an empty environment', () => {
    it('applies the defaults: same-origin API, info logging, no Sentry', () => {
      expect(loadClientConfig({})).toEqual({ PUBLIC_API_URL: '', PUBLIC_LOG_LEVEL: 'info' });
    });
  });

  describe('with variables set', () => {
    it('keeps declared variables and drops undeclared ones', () => {
      const config = loadClientConfig({
        PUBLIC_API_URL: 'http://api.test',
        PUBLIC_SENTRY_DSN: 'https://key@sentry.test/1',
        PUBLIC_LOG_LEVEL: 'debug',
        PUBLIC_OTHER: 'x',
      });

      expect(config).toEqual({
        PUBLIC_API_URL: 'http://api.test',
        PUBLIC_SENTRY_DSN: 'https://key@sentry.test/1',
        PUBLIC_LOG_LEVEL: 'debug',
      });
    });

    it('treats an empty string as unset, so the Sentry DSN stays absent', () => {
      expect(loadClientConfig({ PUBLIC_SENTRY_DSN: '' })).not.toHaveProperty('PUBLIC_SENTRY_DSN');
    });
  });

  describe('with an invalid log level', () => {
    it('throws ConfigurationError naming the variable', () => {
      expect(() => loadClientConfig({ PUBLIC_LOG_LEVEL: 'loud' })).toThrow(ConfigurationError);
      expect(() => loadClientConfig({ PUBLIC_LOG_LEVEL: 'loud' })).toThrow(/PUBLIC_LOG_LEVEL/);
    });
  });
});
