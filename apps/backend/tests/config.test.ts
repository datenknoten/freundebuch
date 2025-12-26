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
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error when JWT_SECRET is missing', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw error when SESSION_SECRET is missing', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should throw an error when JWT_SECRET contains change-this', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('JWT_SECRET', 'test-jwt-change-this-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should succeed with only required fields', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');

      const config = getConfig();

      expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/test');
      expect(config.JWT_SECRET).toBe('test-jwt-secret-test-jwt-secret-1');
      expect(config.SESSION_SECRET).toBe('test-session-secret-test-session-secret-1');
    });
  });

  describe('optional fields with defaults', () => {
    beforeEach(() => {
      // Set required fields
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
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
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
      vi.stubEnv('ENV', undefined);

      const config = getConfig();

      expect(config.ENV).toBe('development');
    });

    it('should handle missing JWT_EXPIRY', () => {
      const config = getConfig();

      expect(config.JWT_EXPIRY).toBe(604800);
    });

    it('should accept JWT_EXPIRY as string', () => {
      vi.stubEnv('JWT_EXPIRY', '2592000');

      const config = getConfig();

      expect(config.JWT_EXPIRY).toBe(2592000);
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
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
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
  });

  describe('LOG_LEVEL validation', () => {
    beforeEach(() => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
    });

    it('should accept valid log levels', () => {
      const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

      for (const level of validLevels) {
        resetConfig();
        vi.unstubAllEnvs();
        vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
        vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
        vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
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

  describe('ENABLE_API_DOCS boolean handling', () => {
    beforeEach(() => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
    });

    it('should parse "true" as boolean true', () => {
      vi.stubEnv('ENABLE_API_DOCS', 'true');

      const config = getConfig();

      expect(config.ENABLE_API_DOCS).toBe(true);
    });

    it('should parse "false" as boolean false', () => {
      vi.stubEnv('ENABLE_API_DOCS', 'false');

      const config = getConfig();

      expect(config.ENABLE_API_DOCS).toBe(false);
    });

    it('should handle missing ENABLE_API_DOCS', () => {
      const config = getConfig();

      expect(config.ENABLE_API_DOCS).toBe(false);
    });
  });

  describe('SMTP configuration', () => {
    beforeEach(() => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
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
  });

  describe('caching behavior', () => {
    it('should cache config after first call', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
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
      vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
      vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
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
      vi.stubEnv('JWT_SECRET', 'super-secret-jwt-key-00000000000');
      vi.stubEnv('JWT_EXPIRY', '1209600');
      vi.stubEnv('SESSION_SECRET', 'super-secret-session-key-super-secret-session-key');
      vi.stubEnv('SMTP_HOST', 'smtp.gmail.com');
      vi.stubEnv('SMTP_PORT', '587');
      vi.stubEnv('SMTP_USER', 'user@gmail.com');
      vi.stubEnv('SMTP_PASSWORD', 'app-password');
      vi.stubEnv('LOG_LEVEL', 'warn');
      vi.stubEnv('ENABLE_API_DOCS', 'false');

      const config = getConfig();

      expect(config).toEqual({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        DATABASE_POOL_MIN: 5,
        DATABASE_POOL_MAX: 20,
        ENV: 'production',
        PORT: 8080,
        FRONTEND_URL: 'https://app.example.com',
        BACKEND_URL: 'http://localhost:3000',
        JWT_SECRET: 'super-secret-jwt-key-00000000000',
        JWT_EXPIRY: 1209600,
        SESSION_SECRET: 'super-secret-session-key-super-secret-session-key',
        SESSION_EXPIRY_DAYS: 7,
        PASSWORD_RESET_EXPIRY_HOURS: 1,
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_USER: 'user@gmail.com',
        SMTP_PASSWORD: 'app-password',
        LOG_LEVEL: 'warn',
        ENABLE_API_DOCS: false,
      });
    });
  });
});
