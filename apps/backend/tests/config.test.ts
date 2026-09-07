import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfig, resetConfig } from '../src/utils/config.js';

describe('getConfig', () => {
  beforeEach(() => {
    // Reset config cache before each test
    resetConfig();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    // Clean up after each test
    resetConfig();
    vi.unstubAllEnvs();
  });

  describe('required fields', () => {
    it('should throw error when DATABASE_URL is missing', () => {
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error when BETTER_AUTH_SECRET is missing', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw an error when BETTER_AUTH_SECRET contains change-this', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-change-this-test-better-auth-secret-1');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should succeed with only required fields', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');

      const config = getConfig();

      expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/test');
      expect(config.BETTER_AUTH_SECRET).toBe('test-better-auth-secret-test-better-auth-secret-1');
    });

    it('should not include removed legacy auth config fields', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');

      const config = getConfig();

      expect(config).not.toHaveProperty('JWT_SECRET');
      expect(config).not.toHaveProperty('SESSION_SECRET');
    });
  });

  describe('optional fields with defaults', () => {
    beforeEach(() => {
      // Set required fields
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    });

    it('should handle missing DATABASE_POOL_MIN and DATABASE_POOL_MAX', () => {
      const config = getConfig();

      expect(config.DATABASE_POOL_MIN).toBe(2);
      expect(config.DATABASE_POOL_MAX).toBe(10);
    });

    it('should parse DATABASE_POOL_MIN as number', () => {
      vi.stubEnv('DATABASE_POOL_MIN', '5');

      const config = getConfig();

      expect(config.DATABASE_POOL_MIN).toBe(5);
      expect(typeof config.DATABASE_POOL_MIN).toBe('number');
    });

    it('should parse DATABASE_POOL_MAX as number', () => {
      vi.stubEnv('DATABASE_POOL_MAX', '20');

      const config = getConfig();

      expect(config.DATABASE_POOL_MAX).toBe(20);
      expect(typeof config.DATABASE_POOL_MAX).toBe('number');
    });

    it('should handle missing PORT', () => {
      const config = getConfig();

      expect(config.PORT).toBe(3000);
    });

    it('should parse PORT as number', () => {
      vi.stubEnv('PORT', '8080');

      const config = getConfig();

      expect(config.PORT).toBe(8080);
      expect(typeof config.PORT).toBe('number');
    });

    it('should handle missing ENV', () => {
      vi.unstubAllEnvs();
      resetConfig();
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
      vi.stubEnv('ENV', undefined);

      const config = getConfig();

      expect(config.ENV).toBe('development');
    });

    it('should handle missing FRONTEND_URL', () => {
      const config = getConfig();

      expect(config.FRONTEND_URL).toBe('http://localhost:5173');
    });

    it('should accept FRONTEND_URL as string', () => {
      vi.stubEnv('FRONTEND_URL', 'http://localhost:3000');

      const config = getConfig();

      expect(config.FRONTEND_URL).toBe('http://localhost:3000');
    });
  });

  describe('ENV validation', () => {
    beforeEach(() => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    });

    it('should accept "development"', () => {
      vi.stubEnv('ENV', 'development');

      const config = getConfig();

      expect(config.ENV).toBe('development');
    });

    it('should accept "production"', () => {
      vi.stubEnv('ENV', 'production');

      const config = getConfig();

      expect(config.ENV).toBe('production');
    });

    it('should accept "test"', () => {
      vi.stubEnv('ENV', 'test');

      const config = getConfig();

      expect(config.ENV).toBe('test');
    });

    it('should reject invalid ENV value', () => {
      vi.stubEnv('ENV', 'invalid');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    /**
     * ENV and NODE_ENV are separate on purpose and neither stands in for the
     * other: NODE_ENV drives Node and the ecosystem (devDependency pruning,
     * library dev branches), ENV drives this application's behaviour. A
     * deployment that sets only NODE_ENV — which is what the production
     * compose file did — runs the app as a development deployment: dev log
     * format, Sentry's production guards off, and reset links in the debug
     * log.
     */
    it('does not infer the deployment from NODE_ENV', () => {
      vi.stubEnv('ENV', undefined);
      vi.stubEnv('NODE_ENV', 'production');

      expect(getConfig().ENV).toBe('development');
    });

    it('reads ENV independently of NODE_ENV', () => {
      vi.stubEnv('ENV', 'production');
      vi.stubEnv('NODE_ENV', 'development');

      expect(getConfig().ENV).toBe('production');
    });
  });

  describe('LOG_LEVEL validation', () => {
    beforeEach(() => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    });

    it('should accept valid log levels', () => {
      const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

      for (const level of validLevels) {
        resetConfig();
        vi.unstubAllEnvs();
        vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
        vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
        vi.stubEnv('LOG_LEVEL', level);

        const config = getConfig();

        expect(config.LOG_LEVEL).toBe(level);
      }
    });

    it('should reject invalid LOG_LEVEL value', () => {
      vi.stubEnv('LOG_LEVEL', 'verbose');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });
  });

  describe('TRUST_PROXY boolean handling', () => {
    beforeEach(() => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    });

    it('should parse "true" as boolean true', () => {
      vi.stubEnv('TRUST_PROXY', 'true');

      const config = getConfig();

      expect(config.TRUST_PROXY).toBe(true);
    });

    it('should parse "false" as boolean false', () => {
      vi.stubEnv('TRUST_PROXY', 'false');

      const config = getConfig();

      expect(config.TRUST_PROXY).toBe(false);
    });

    it('should handle missing TRUST_PROXY', () => {
      const config = getConfig();

      expect(config.TRUST_PROXY).toBe(false);
    });
  });

  describe('SMTP configuration', () => {
    beforeEach(() => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    });

    it('should handle all SMTP fields as optional', () => {
      const config = getConfig();

      expect(config.SMTP_HOST).toBeUndefined();
      expect(config.SMTP_PORT).toBeUndefined();
      expect(config.SMTP_USER).toBeUndefined();
      expect(config.SMTP_PASSWORD).toBeUndefined();
    });

    it('should accept SMTP configuration when provided', () => {
      vi.stubEnv('SMTP_HOST', 'smtp.example.com');
      vi.stubEnv('SMTP_PORT', '587');
      vi.stubEnv('SMTP_USER', 'user@example.com');
      vi.stubEnv('SMTP_PASSWORD', 'password123');

      const config = getConfig();

      expect(config.SMTP_HOST).toBe('smtp.example.com');
      expect(config.SMTP_PORT).toBe(587);
      expect(config.SMTP_USER).toBe('user@example.com');
      expect(config.SMTP_PASSWORD).toBe('password123');
    });

    it('should parse SMTP_PORT as number', () => {
      vi.stubEnv('SMTP_PORT', '465');

      const config = getConfig();

      expect(config.SMTP_PORT).toBe(465);
      expect(typeof config.SMTP_PORT).toBe('number');
    });

    it('should default SMTP_SECURE to false and accept boolean strings', () => {
      expect(getConfig().SMTP_SECURE).toBe(false);

      resetConfig();
      vi.stubEnv('SMTP_SECURE', 'true');
      expect(getConfig().SMTP_SECURE).toBe(true);

      resetConfig();
      vi.stubEnv('SMTP_SECURE', '0');
      expect(getConfig().SMTP_SECURE).toBe(false);
    });

    it('should treat SMTP_FROM as optional', () => {
      expect(getConfig().SMTP_FROM).toBeUndefined();

      resetConfig();
      vi.stubEnv('SMTP_FROM', 'Freundebuch <no-reply@example.com>');
      expect(getConfig().SMTP_FROM).toBe('Freundebuch <no-reply@example.com>');
    });
  });

  describe('DISABLE_SIGNUP handling', () => {
    beforeEach(() => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
    });

    it('should default to false so a fresh instance allows sign-up', () => {
      expect(getConfig().DISABLE_SIGNUP).toBe(false);
    });

    it('should parse truthy strings', () => {
      vi.stubEnv('DISABLE_SIGNUP', 'true');
      expect(getConfig().DISABLE_SIGNUP).toBe(true);

      resetConfig();
      vi.stubEnv('DISABLE_SIGNUP', '1');
      expect(getConfig().DISABLE_SIGNUP).toBe(true);
    });
  });

  describe('caching behavior', () => {
    it('should cache config after first call', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
      vi.stubEnv('PORT', '3000');

      const config1 = getConfig();

      // Change environment variable (but cache should return old value)
      vi.stubEnv('PORT', '4000');

      const config2 = getConfig();

      // Should return cached value
      expect(config2.PORT).toBe(3000);
      expect(config1).toBe(config2); // Same object reference
    });

    it('should re-read after resetConfig', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
      vi.stubEnv('PORT', '3000');

      const config1 = getConfig();

      expect(config1.PORT).toBe(3000);

      // Reset and change environment
      resetConfig();
      vi.stubEnv('PORT', '4000');

      const config2 = getConfig();

      // Should return new value
      expect(config2.PORT).toBe(4000);
    });
  });

  describe('complete configuration', () => {
    it('should handle all fields when provided', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
      vi.stubEnv('DATABASE_POOL_MIN', '5');
      vi.stubEnv('DATABASE_POOL_MAX', '20');
      vi.stubEnv('ENV', 'production');
      vi.stubEnv('PORT', '8080');
      vi.stubEnv('FRONTEND_URL', 'https://app.example.com');
      vi.stubEnv('BETTER_AUTH_SECRET', 'super-secret-better-auth-key-00000000000');
      vi.stubEnv('SMTP_HOST', 'smtp.gmail.com');
      vi.stubEnv('SMTP_PORT', '587');
      vi.stubEnv('SMTP_USER', 'user@gmail.com');
      vi.stubEnv('SMTP_PASSWORD', 'app-password');
      vi.stubEnv('LOG_LEVEL', 'warn');
      vi.stubEnv('TRUST_PROXY', 'true');

      const config = getConfig();

      expect(config.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
      expect(config.DATABASE_POOL_MIN).toBe(5);
      expect(config.DATABASE_POOL_MAX).toBe(20);
      expect(config.ENV).toBe('production');
      expect(config.PORT).toBe(8080);
      expect(config.FRONTEND_URL).toBe('https://app.example.com');
      expect(config.BETTER_AUTH_SECRET).toBe('super-secret-better-auth-key-00000000000');
      expect(config.SMTP_HOST).toBe('smtp.gmail.com');
      expect(config.SMTP_PORT).toBe(587);
      expect(config.SMTP_USER).toBe('user@gmail.com');
      expect(config.SMTP_PASSWORD).toBe('app-password');
      expect(config.LOG_LEVEL).toBe('warn');
      expect(config.TRUST_PROXY).toBe(true);
    });
  });
});
