import { ConfigurationError } from '@datenknoten/kit';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { TEST_ENV } from './helpers/test-env.js';

describe('loadConfig', () => {
  describe('with only the required variables', () => {
    it('fills every optional setting from the schema defaults', () => {
      const config = loadConfig({
        DATABASE_URL: TEST_ENV.DATABASE_URL,
        BETTER_AUTH_SECRET: TEST_ENV.BETTER_AUTH_SECRET,
        ENV: 'production',
      });

      expect(config).toMatchObject({
        MCP_PORT: 3100,
        DATABASE_POOL_MIN: 1,
        DATABASE_POOL_MAX: 5,
        LOG_LEVEL: 'info',
        RATE_LIMIT_ENABLED: true,
        DISABLE_SIGNUP: false,
        FRONTEND_URL: 'http://localhost:5173',
      });
      expect(config.BETTER_AUTH_URL).toBeUndefined();
    });
  });

  describe('with blank or unknown variables', () => {
    it('treats an empty string as unset and drops keys the schema does not declare', () => {
      const config = loadConfig({ ...TEST_ENV, MCP_PORT: '', BETTER_AUTH_URL: '', HOME: '/root' });

      expect(config.MCP_PORT).toBe(3100);
      expect(config.BETTER_AUTH_URL).toBeUndefined();
      expect(config).not.toHaveProperty('HOME');
    });
  });

  describe('with invalid variables', () => {
    it('throws one ConfigurationError that names every problem', () => {
      const env = { ...TEST_ENV, DATABASE_URL: undefined, LOG_LEVEL: 'nonsense' };

      expect(() => loadConfig(env)).toThrow(ConfigurationError);
      expect(() => loadConfig(env)).toThrow(
        /DATABASE_URL[\s\S]*LOG_LEVEL|LOG_LEVEL[\s\S]*DATABASE_URL/,
      );
    });
  });
});
