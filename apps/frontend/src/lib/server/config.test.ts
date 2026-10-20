import { ConfigurationError } from '@datenknoten/kit';
import { describe, expect, it } from 'vitest';
import { loadServerConfig } from './config.js';

describe('loadServerConfig', () => {
  describe('with an empty environment', () => {
    it('applies the defaults: local backend, development mode, no Sentry', () => {
      expect(loadServerConfig({})).toEqual({
        API_URL: 'http://localhost:8787',
        NODE_ENV: 'development',
      });
    });
  });

  describe('with variables set', () => {
    it('keeps declared variables and drops undeclared ones', () => {
      const config = loadServerConfig({
        API_URL: 'http://backend:3000',
        NODE_ENV: 'production',
        SENTRY_DSN: 'https://key@sentry.test/1',
        HOME: '/root',
      });

      expect(config).toEqual({
        API_URL: 'http://backend:3000',
        NODE_ENV: 'production',
        SENTRY_DSN: 'https://key@sentry.test/1',
      });
    });

    it('treats an empty string as unset, so the default API URL applies', () => {
      expect(loadServerConfig({ API_URL: '', SENTRY_DSN: '' })).toEqual({
        API_URL: 'http://localhost:8787',
        NODE_ENV: 'development',
      });
    });
  });

  describe('with an unknown NODE_ENV', () => {
    it('throws ConfigurationError naming the variable', () => {
      expect(() => loadServerConfig({ NODE_ENV: 'staging' })).toThrow(ConfigurationError);
      expect(() => loadServerConfig({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    });
  });
});
