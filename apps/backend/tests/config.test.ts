import { ConfigurationError } from '@datenknoten/kit';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { TEST_AUTH_SECRET as SECRET } from './helpers/test-env.js';

const DATABASE_URL = 'postgresql://localhost:5432/test';
const REQUIRED = { DATABASE_URL, BETTER_AUTH_SECRET: SECRET } as const;

describe('loadConfig', () => {
  describe('required fields', () => {
    it('throws a ConfigurationError when DATABASE_URL is missing', () => {
      expect(() => loadConfig({ BETTER_AUTH_SECRET: SECRET })).toThrow(ConfigurationError);
    });

    it('throws a ConfigurationError when BETTER_AUTH_SECRET is missing', () => {
      expect(() => loadConfig({ DATABASE_URL })).toThrow(ConfigurationError);
    });

    it('names the fix when BETTER_AUTH_SECRET is a placeholder', () => {
      // The rejection is deliberate (a copied dev secret must not reach
      // production), so the message has to say what to do instead of showing
      // the negative lookahead.
      const env = {
        DATABASE_URL,
        BETTER_AUTH_SECRET: 'test-change-this-test-better-auth-secret-1',
      };

      expect(() => loadConfig(env)).toThrow(ConfigurationError);
      expect(() => loadConfig(env)).toThrow('openssl rand -hex 32');
    });

    it.each(['your-secret', 'REPLACE'])('rejects the %s placeholder too', (placeholder) => {
      expect(() =>
        loadConfig({
          DATABASE_URL,
          BETTER_AUTH_SECRET: `prefix-${placeholder}-suffix-padding-to-32-chars`,
        }),
      ).toThrow(ConfigurationError);
    });

    it('succeeds with only the required fields', () => {
      const config = loadConfig({ ...REQUIRED });

      expect(config.DATABASE_URL).toBe(DATABASE_URL);
      expect(config.BETTER_AUTH_SECRET).toBe(SECRET);
    });

    it('strips variables the schema does not declare', () => {
      const config = loadConfig({ ...REQUIRED, JWT_SECRET: 'legacy', SESSION_SECRET: 'legacy' });

      expect(config).not.toHaveProperty('JWT_SECRET');
      expect(config).not.toHaveProperty('SESSION_SECRET');
    });

    it('lists every invalid variable in one error', () => {
      expect(() => loadConfig({ ...REQUIRED, LOG_LEVEL: 'verbose', ENV: 'invalid' })).toThrow(
        /LOG_LEVEL[\s\S]*ENV|ENV[\s\S]*LOG_LEVEL/,
      );
    });
  });

  describe('defaults', () => {
    it('applies the schema default for every optional variable', () => {
      const config = loadConfig({ ...REQUIRED });

      expect(config.DATABASE_POOL_MIN).toBe(2);
      expect(config.DATABASE_POOL_MAX).toBe(10);
      expect(config.PORT).toBe(3000);
      expect(config.ENV).toBe('development');
      expect(config.FRONTEND_URL).toBe('http://localhost:5173');
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.TRUST_PROXY).toBe(false);
      expect(config.RATE_LIMIT_ENABLED).toBe(true);
      expect(config.DISABLE_SIGNUP).toBe(false);
      expect(config.SMTP_SECURE).toBe(false);
      expect(config.UPLOAD_DIR).toBe(`${process.cwd()}/uploads/friends`);
    });

    it('parses numeric variables into numbers', () => {
      const config = loadConfig({
        ...REQUIRED,
        DATABASE_POOL_MIN: '5',
        DATABASE_POOL_MAX: '20',
        PORT: '8080',
      });

      expect(config.DATABASE_POOL_MIN).toBe(5);
      expect(config.DATABASE_POOL_MAX).toBe(20);
      expect(config.PORT).toBe(8080);
    });

    it('takes UPLOAD_DIR from the environment when set', () => {
      expect(loadConfig({ ...REQUIRED, UPLOAD_DIR: '/data/uploads' }).UPLOAD_DIR).toBe(
        '/data/uploads',
      );
    });
  });

  describe('ENV', () => {
    it.each(['development', 'production', 'test'])('accepts %s', (env) => {
      expect(loadConfig({ ...REQUIRED, ENV: env }).ENV).toBe(env);
    });

    it('rejects an unknown deployment', () => {
      expect(() => loadConfig({ ...REQUIRED, ENV: 'invalid' })).toThrow(ConfigurationError);
    });

    /**
     * ENV and NODE_ENV are separate on purpose and neither stands in for the
     * other: NODE_ENV drives Node and the ecosystem (devDependency pruning,
     * library dev branches), ENV drives this application's behaviour.
     */
    it('does not infer the deployment from NODE_ENV', () => {
      expect(loadConfig({ ...REQUIRED, NODE_ENV: 'production' }).ENV).toBe('development');
    });

    it('reads ENV independently of NODE_ENV', () => {
      expect(loadConfig({ ...REQUIRED, ENV: 'production', NODE_ENV: 'development' }).ENV).toBe(
        'production',
      );
    });
  });

  describe('LOG_LEVEL', () => {
    it.each(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])(
      'accepts %s',
      (level) => {
        expect(loadConfig({ ...REQUIRED, LOG_LEVEL: level }).LOG_LEVEL).toBe(level);
      },
    );

    it('rejects an unknown level and names the variable', () => {
      expect(() => loadConfig({ ...REQUIRED, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
    });
  });

  describe('boolean variables', () => {
    it('parses TRUST_PROXY strings into booleans', () => {
      expect(loadConfig({ ...REQUIRED, TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(true);
      expect(loadConfig({ ...REQUIRED, TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(false);
    });

    it('parses RATE_LIMIT_ENABLED strings into booleans', () => {
      expect(loadConfig({ ...REQUIRED, RATE_LIMIT_ENABLED: 'false' }).RATE_LIMIT_ENABLED).toBe(
        false,
      );
      expect(loadConfig({ ...REQUIRED, RATE_LIMIT_ENABLED: 'true' }).RATE_LIMIT_ENABLED).toBe(true);
    });

    it('parses SMTP_SECURE and DISABLE_SIGNUP truthy strings', () => {
      expect(loadConfig({ ...REQUIRED, SMTP_SECURE: 'true' }).SMTP_SECURE).toBe(true);
      expect(loadConfig({ ...REQUIRED, SMTP_SECURE: '0' }).SMTP_SECURE).toBe(false);
      expect(loadConfig({ ...REQUIRED, DISABLE_SIGNUP: 'true' }).DISABLE_SIGNUP).toBe(true);
      expect(loadConfig({ ...REQUIRED, DISABLE_SIGNUP: '1' }).DISABLE_SIGNUP).toBe(true);
    });
  });

  describe('SMTP', () => {
    it('leaves every SMTP field unset by default', () => {
      const config = loadConfig({ ...REQUIRED });

      expect(config.SMTP_HOST).toBeUndefined();
      expect(config.SMTP_PORT).toBeUndefined();
      expect(config.SMTP_USER).toBeUndefined();
      expect(config.SMTP_PASSWORD).toBeUndefined();
      expect(config.SMTP_FROM).toBeUndefined();
    });

    it('accepts the SMTP fields and parses the port', () => {
      const config = loadConfig({
        ...REQUIRED,
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_USER: 'user@example.com',
        SMTP_PASSWORD: 'password123',
        SMTP_FROM: 'Freundebuch <no-reply@example.com>',
      });

      expect(config.SMTP_HOST).toBe('smtp.example.com');
      expect(config.SMTP_PORT).toBe(587);
      expect(config.SMTP_USER).toBe('user@example.com');
      expect(config.SMTP_PASSWORD).toBe('password123');
      expect(config.SMTP_FROM).toBe('Freundebuch <no-reply@example.com>');
    });
  });

  describe('empty values', () => {
    it('treats an empty SMTP_PORT as unset instead of failing to parse', () => {
      expect(loadConfig({ ...REQUIRED, SMTP_PORT: '' }).SMTP_PORT).toBeUndefined();
    });

    it('treats an empty variable with a default as unset so the default applies', () => {
      expect(loadConfig({ ...REQUIRED, LOG_LEVEL: '' }).LOG_LEVEL).toBe('info');
    });
  });

  describe('purity', () => {
    it('returns a fresh config for every call', () => {
      expect(loadConfig({ ...REQUIRED, PORT: '3000' }).PORT).toBe(3000);
      expect(loadConfig({ ...REQUIRED, PORT: '4000' }).PORT).toBe(4000);
    });
  });
});
