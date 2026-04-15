import bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '../src/utils/auth.js';
import { resetConfig } from '../src/utils/config.js';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

describe('auth.ts', () => {
  beforeEach(() => {
    // Set required environment variables
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
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
      const password = 'N1neChars';
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
});
