import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSessionToken,
  generateToken,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  verifyPassword,
  verifyToken,
} from '../src/utils/auth.ts';
import { resetConfig } from '../src/utils/config.ts';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

describe('auth.ts', () => {
  beforeEach(() => {
    // Set required environment variables
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
    vi.stubEnv('JWT_EXPIRY', '604800');
    resetConfig();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetConfig();
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'SecurePassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);

      const result = await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });

    it('should throw WeakPasswordError for password less than 9 characters', async () => {
      const password = 'Short1';

      await expect(hashPassword(password)).rejects.toThrow();
    });

    it('should accept password with exactly 9 characters', async () => {
      const password = 'NineChars';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);

      const result = await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });

    it('should accept long passwords', async () => {
      const password = 'ThisIsAVeryLongPasswordWithMoreThan50Characters12345';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);

      const result = await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });

    it('should reject empty string', async () => {
      const password = '';

      await expect(hashPassword(password)).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'SecurePassword123';
      const hash = '$2b$10$hashedPasswordExample';

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await verifyPassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'WrongPassword';
      const hash = '$2b$10$hashedPasswordExample';

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const result = await verifyPassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = '$2b$10$hashedPasswordExample';

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const result = await verifyPassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with valid payload', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
      };
      const expectedToken = 'jwt.token.here';

      vi.mocked(jwt.sign).mockReturnValue(expectedToken as never);

      const token = generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(payload, 'test-jwt-secret-test-jwt-secret-1', {
        expiresIn: 604800,
      });
      expect(token).toBe(expectedToken);
    });

    it('should throw InvalidPayloadError when userId is missing', () => {
      const payload = {
        email: 'test@example.com',
      };

      expect(() => generateToken(payload)).toThrow();
    });

    it('should throw InvalidPayloadError when email is missing', () => {
      const payload = {
        userId: '123',
      };

      expect(() => generateToken(payload)).toThrow();
    });

    it('should throw InvalidPayloadError when userId is not a string', () => {
      const payload = {
        userId: 123,
        email: 'test@example.com',
      };

      expect(() => generateToken(payload)).toThrow();
    });

    it('should throw InvalidPayloadError when email is not a string', () => {
      const payload = {
        userId: '123',
        email: 12345,
      };

      expect(() => generateToken(payload)).toThrow();
    });

    it('should throw InvalidPayloadError for empty object', () => {
      const payload = {};

      expect(() => generateToken(payload)).toThrow();
    });

    it('should use custom JWT_EXPIRY from config', () => {
      vi.stubEnv('JWT_EXPIRY', '86400');
      resetConfig();

      const payload = {
        userId: '123',
        email: 'test@example.com',
      };
      const expectedToken = 'jwt.token.here';

      vi.mocked(jwt.sign).mockReturnValue(expectedToken as never);

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(payload, 'test-jwt-secret-test-jwt-secret-1', {
        expiresIn: 86400,
      });
    });
  });

  describe('verifyToken', () => {
    it('should return payload for valid token', () => {
      const token = 'valid.jwt.token';
      const payload = {
        userId: '123',
        email: 'test@example.com',
      };

      vi.mocked(jwt.verify).mockReturnValue(payload as never);

      const result = verifyToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-jwt-secret-test-jwt-secret-1');
      expect(result).toEqual(payload);
    });

    it('should return null for expired token', () => {
      const token = 'expired.jwt.token';

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const result = verifyToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-jwt-secret-test-jwt-secret-1');
      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      const token = 'invalid.jwt.token';

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('invalid token');
      });

      const result = verifyToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-jwt-secret-test-jwt-secret-1');
      expect(result).toBeNull();
    });

    it('should return null when payload is missing userId', () => {
      const token = 'valid.jwt.token';
      const payload = {
        email: 'test@example.com',
      };

      vi.mocked(jwt.verify).mockReturnValue(payload as never);

      const result = verifyToken(token);

      expect(result).toBeNull();
    });

    it('should return null when payload is missing email', () => {
      const token = 'valid.jwt.token';
      const payload = {
        userId: '123',
      };

      vi.mocked(jwt.verify).mockReturnValue(payload as never);

      const result = verifyToken(token);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      const token = 'malformed';

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const result = verifyToken(token);

      expect(result).toBeNull();
    });
  });

  describe('generateSessionToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateSessionToken();

      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(token.length).toBe(64);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      const token3 = generateSessionToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate cryptographically random tokens', () => {
      // Generate multiple tokens and ensure they're all different
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSessionToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe('hashSessionToken', () => {
    it('should return a 64-character hex string (SHA-256)', () => {
      const token = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const hash = hashSessionToken(token);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should produce consistent hashes for the same input', () => {
      const token = 'test-token-12345';
      const hash1 = hashSessionToken(token);
      const hash2 = hashSessionToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const token1 = 'token-one';
      const token2 = 'token-two';

      const hash1 = hashSessionToken(token1);
      const hash2 = hashSessionToken(token2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty strings', () => {
      const token = '';
      const hash = hashSessionToken(token);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should produce known SHA-256 hash', () => {
      // Test with known input/output
      const token = 'hello';
      const hash = hashSessionToken(token);

      // SHA-256 of "hello" is known
      const expectedHash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
      expect(hash).toBe(expectedHash);
    });
  });

  describe('getSessionExpiry', () => {
    it('should return a date 7 days in the future', () => {
      const now = new Date();
      const expiry = getSessionExpiry();
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);

      // Allow 1 second difference for test execution time
      const diff = Math.abs(expiry.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(1000);
    });

    it('should return a Date object', () => {
      const expiry = getSessionExpiry();

      expect(expiry).toBeInstanceOf(Date);
    });

    it('should return different times when called at different times', async () => {
      const expiry1 = getSessionExpiry();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const expiry2 = getSessionExpiry();

      expect(expiry2.getTime()).toBeGreaterThanOrEqual(expiry1.getTime());
    });

    it('should return a future date', () => {
      const now = new Date();
      const expiry = getSessionExpiry();

      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should be approximately 7 days (604800000 ms) in the future', () => {
      const now = new Date();
      const expiry = getSessionExpiry();
      const diff = expiry.getTime() - now.getTime();

      // Should be 7 days (604800000 ms) ± 1 second
      expect(diff).toBeGreaterThan(604799000);
      expect(diff).toBeLessThan(604801000);
    });
  });
});
