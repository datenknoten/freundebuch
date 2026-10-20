import bcrypt from 'bcrypt';
import type pg from 'pg';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppPasswordNotFoundError } from '../../src/errors/app-password-not-found.error.js';
import {
  createAppPassword,
  getAppPasswordsByUserExternalId,
  getAppPasswordsByUserIdAndPrefix,
  getUserByEmailWithInternalId,
  revokeAppPassword,
  updateAppPasswordLastUsed,
} from '../../src/models/queries/app-passwords.queries.js';
import { AppPasswordsService } from '../../src/services/app-passwords.service.js';
import { hashAppPasswordPrefix } from '../../src/utils/hash-app-password-prefix.js';

const VALID_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_PASSWORD_ID = '6ba7b810-9dad-41d4-80b5-ec8bdd0e9ef0';

describe('AppPasswordsService', () => {
  let service: AppPasswordsService;
  // Every query is spied on below, so the pool is never touched.
  const mockDb = {} as pg.Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const query of [
      getAppPasswordsByUserExternalId,
      createAppPassword,
      revokeAppPassword,
      getUserByEmailWithInternalId,
      getAppPasswordsByUserIdAndPrefix,
      updateAppPasswordLastUsed,
    ]) {
      vi.spyOn(query, 'run').mockResolvedValue([]);
    }
    service = new AppPasswordsService({ db: mockDb, logger: pino({ level: 'silent' }) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hashAppPasswordPrefix', () => {
    it('matches the SabreDAV implementation for a known prefix', () => {
      // apps/sabredav computes substr(hash('sha256', $prefix), 0, 16); the PHP
      // test suite asserts the same literal for the same input.
      expect(hashAppPasswordPrefix('abcd1234')).toBe('e9cee71ab932fde8');
    });

    it('produces a 16-char lowercase hex key', () => {
      expect(hashAppPasswordPrefix('AAAA-BBB')).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('listAppPasswords', () => {
    it('returns empty array when no passwords exist', async () => {
      vi.mocked(getAppPasswordsByUserExternalId.run).mockResolvedValue([]);

      const result = await service.listAppPasswords(VALID_USER_ID);

      expect(result).toEqual([]);
      expect(getAppPasswordsByUserExternalId.run).toHaveBeenCalledWith(
        { userExternalId: VALID_USER_ID },
        mockDb,
      );
    });

    it('returns mapped passwords', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      vi.mocked(getAppPasswordsByUserExternalId.run).mockResolvedValue([
        {
          external_id: VALID_PASSWORD_ID,
          name: 'My iPhone',
          last_used_at: now,
          created_at: now,
        },
        {
          external_id: '6ba7b810-9dad-41d4-80b5-ec8bdd0e9ef1',
          name: 'Thunderbird',
          last_used_at: null,
          created_at: now,
        },
      ]);

      const result = await service.listAppPasswords(VALID_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        externalId: VALID_PASSWORD_ID,
        name: 'My iPhone',
        lastUsedAt: '2024-01-15T12:00:00.000Z',
        createdAt: '2024-01-15T12:00:00.000Z',
      });
      // The stored prefix is a hash and never leaves the database.
      expect(result[0]).not.toHaveProperty('passwordPrefix');
      expect(result[1]?.lastUsedAt).toBeNull();
    });
  });

  describe('createAppPassword', () => {
    beforeEach(() => {
      // Mock listAppPasswords to return empty array (allows password creation)
      vi.mocked(getAppPasswordsByUserExternalId.run).mockResolvedValue([]);
    });

    it('creates and returns a password with secret', async () => {
      const createdAt = new Date('2024-01-15T12:00:00Z');
      vi.mocked(createAppPassword.run).mockResolvedValue([
        {
          external_id: VALID_PASSWORD_ID,
          name: 'My iPhone',
          created_at: createdAt,
        },
      ]);

      const result = await service.createAppPassword(VALID_USER_ID, 'My iPhone');

      expect(result.externalId).toBe(VALID_PASSWORD_ID);
      expect(result.name).toBe('My iPhone');
      expect(result.password).toBeDefined();
      expect(result.password).toMatch(/^[a-zA-Z0-9_-]{4}-[a-zA-Z0-9_-]{4}-/);
      expect(result.createdAt).toBe('2024-01-15T12:00:00.000Z');
    });

    it('throws error if creation fails', async () => {
      vi.mocked(createAppPassword.run).mockResolvedValue([]);

      await expect(service.createAppPassword(VALID_USER_ID, 'My iPhone')).rejects.toThrow(
        'Failed to create app password',
      );
    });

    it('hashes the password before storing', async () => {
      const createdAt = new Date('2024-01-15T12:00:00Z');
      vi.mocked(createAppPassword.run).mockResolvedValue([
        {
          external_id: VALID_PASSWORD_ID,
          name: 'My iPhone',
          created_at: createdAt,
        },
      ]);

      const result = await service.createAppPassword(VALID_USER_ID, 'My iPhone');

      const rawPrefix = result.passwordPrefix;
      expect(createAppPassword.run).toHaveBeenCalledWith(
        expect.objectContaining({
          userExternalId: VALID_USER_ID,
          name: 'My iPhone',
          passwordHash: expect.stringMatching(/^\$2[aby]\$\d{2}\$/),
          passwordPrefix: hashAppPasswordPrefix(rawPrefix),
        }),
        mockDb,
      );
    });

    it('stores a hashed prefix but returns the raw one', async () => {
      const createdAt = new Date('2024-01-15T12:00:00Z');
      vi.mocked(createAppPassword.run).mockResolvedValue([
        {
          external_id: VALID_PASSWORD_ID,
          name: 'My iPhone',
          created_at: createdAt,
        },
      ]);

      const result = await service.createAppPassword(VALID_USER_ID, 'My iPhone');

      // formatPassword inserts a separator after every 4 chars, so the raw
      // 8-char prefix is chunk 1 + chunk 2 of the formatted password. Derived
      // by position, not by splitting on '-', because base64url itself
      // contains '-'.
      expect(result.passwordPrefix).toMatch(/^[a-zA-Z0-9_-]{8}$/);
      expect(result.password.slice(0, 4)).toBe(result.passwordPrefix.slice(0, 4));
      expect(result.password.slice(5, 9)).toBe(result.passwordPrefix.slice(4, 8));

      const stored = vi.mocked(createAppPassword.run).mock.calls[0]?.[0].passwordPrefix;
      expect(stored).toBe(hashAppPasswordPrefix(result.passwordPrefix));
      expect(stored).toMatch(/^[0-9a-f]{16}$/);
    });

    it('formats password with dashes', async () => {
      const createdAt = new Date('2024-01-15T12:00:00Z');
      vi.mocked(createAppPassword.run).mockResolvedValue([
        {
          external_id: VALID_PASSWORD_ID,
          name: 'My iPhone',
          created_at: createdAt,
        },
      ]);

      const result = await service.createAppPassword(VALID_USER_ID, 'My iPhone');

      // Password should be formatted with dashes
      expect(result.password).toContain('-');
      const parts = result.password.split('-');
      expect(parts.length).toBeGreaterThan(1);

      // Raw password (without dashes) should be around 32 characters (24 bytes base64url encoded)
      // Base64url can produce slightly variable length depending on encoding
      const rawPassword = result.password.replace(/-/g, '');
      expect(rawPassword.length).toBeGreaterThanOrEqual(30);
      expect(rawPassword.length).toBeLessThanOrEqual(34);
    });
  });

  describe('revokeAppPassword', () => {
    it('resolves when password is revoked', async () => {
      vi.mocked(revokeAppPassword.run).mockResolvedValue([{ external_id: VALID_PASSWORD_ID }]);

      await service.revokeAppPassword(VALID_USER_ID, VALID_PASSWORD_ID);

      expect(revokeAppPassword.run).toHaveBeenCalledWith(
        {
          userExternalId: VALID_USER_ID,
          appPasswordExternalId: VALID_PASSWORD_ID,
        },
        mockDb,
      );
    });

    it('throws AppPasswordNotFoundError when password not found', async () => {
      vi.mocked(revokeAppPassword.run).mockResolvedValue([]);

      await expect(service.revokeAppPassword(VALID_USER_ID, VALID_PASSWORD_ID)).rejects.toThrow(
        AppPasswordNotFoundError,
      );
    });
  });

  describe('verifyAppPassword', () => {
    const testEmail = 'user@example.com';
    const testPassword = 'abcd1234efgh5678ijkl9012';

    it('returns undefined for unknown user', async () => {
      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([]);

      const result = await service.verifyAppPassword(testEmail, testPassword);

      expect(result).toBeUndefined();
    });

    it('still spends one bcrypt compare for an unknown email', async () => {
      // Otherwise the response time tells an attacker which addresses exist.
      const compareSpy = vi.spyOn(bcrypt, 'compare');
      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([]);

      const result = await service.verifyAppPassword(testEmail, testPassword);

      expect(result).toBeUndefined();
      expect(compareSpy).toHaveBeenCalledTimes(1);
      expect(compareSpy).toHaveBeenCalledWith(testPassword, expect.stringMatching(/^\$2[aby]\$/));
    });

    it('returns undefined when no matching prefix', async () => {
      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([]);

      const result = await service.verifyAppPassword(testEmail, testPassword);

      expect(result).toBeUndefined();
    });

    it('still spends one bcrypt compare when no stored prefix matches', async () => {
      const compareSpy = vi.spyOn(bcrypt, 'compare');
      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([]);

      const result = await service.verifyAppPassword(testEmail, testPassword);

      expect(result).toBeUndefined();
      expect(compareSpy).toHaveBeenCalledTimes(1);
    });

    it('returns undefined for wrong password', async () => {
      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);

      const wrongPasswordHash = await bcrypt.hash('wrongpassword123456789012', 10);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([
        {
          id: 1,
          external_id: VALID_PASSWORD_ID,
          password_hash: wrongPasswordHash,
        },
      ]);

      const result = await service.verifyAppPassword(testEmail, testPassword);

      expect(result).toBeUndefined();
    });

    it('returns context for correct password', async () => {
      const passwordHash = await bcrypt.hash(testPassword, 10);

      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([
        {
          id: 1,
          external_id: VALID_PASSWORD_ID,
          password_hash: passwordHash,
        },
      ]);
      vi.mocked(updateAppPasswordLastUsed.run).mockResolvedValue([]);

      const result = await service.verifyAppPassword(testEmail, testPassword);

      expect(result).toEqual({
        userId: VALID_USER_ID,
        email: testEmail,
        appPasswordId: VALID_PASSWORD_ID,
      });
    });

    it('handles password with dashes', async () => {
      const rawPassword = 'abcd1234efgh5678ijkl9012';
      const formattedPassword = 'abcd-1234-efgh-5678-ijkl-9012';
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([
        {
          id: 1,
          external_id: VALID_PASSWORD_ID,
          password_hash: passwordHash,
        },
      ]);
      vi.mocked(updateAppPasswordLastUsed.run).mockResolvedValue([]);

      const result = await service.verifyAppPassword(testEmail, formattedPassword);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(VALID_USER_ID);
    });

    it('preserves raw dashes that are part of base64url', async () => {
      // Regression: verifyAppPassword used to strip ALL dashes, corrupting passwords
      // whose base64url raw contains '-' (a valid base64url char).
      // Raw: 32-char base64url with embedded '-'. Format inserts '-' after each 4 chars:
      // "AAAA" | "-BBB" | "CCCC" | "DDDD" | "EEEE" | "FFFF" | "GGGG" | "HHHH"
      // → "AAAA--BBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH"
      const rawPassword = 'AAAA-BBBCCCCDDDDEEEEFFFFGGGGHHHH';
      const formattedPassword = 'AAAA--BBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH';
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([
        {
          id: 1,
          external_id: VALID_PASSWORD_ID,
          password_hash: passwordHash,
        },
      ]);
      vi.mocked(updateAppPasswordLastUsed.run).mockResolvedValue([]);

      const result = await service.verifyAppPassword(testEmail, formattedPassword);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(VALID_USER_ID);
      expect(getAppPasswordsByUserIdAndPrefix.run).toHaveBeenCalledWith(
        { userId: 1, prefix: hashAppPasswordPrefix('AAAA-BBB') },
        mockDb,
      );
    });

    it('falls back to strip-all-dashes when separator slots are malformed', async () => {
      // Input has well-formatted length (39 chars) but a non-'-' sits where a
      // format separator should be. Rather than passing the mangled string to
      // bcrypt, the service falls back to the legacy strip-all-dashes path.
      // The bcrypt compare still fails (input is malformed), so we get 401.
      const malformed = 'abcdXefgh-ijkl-mnop-qrst-uvwx-yz12-3456-7890';
      const hashOfArbitrary = await bcrypt.hash('something-unrelated', 10);

      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([
        {
          id: 1,
          external_id: VALID_PASSWORD_ID,
          password_hash: hashOfArbitrary,
        },
      ]);

      const result = await service.verifyAppPassword(testEmail, malformed);

      expect(result).toBeUndefined();
      // Prefix derived from fallback: strip all dashes → "abcdXefghijklmnopqrstuvwxyz1234567890"
      expect(getAppPasswordsByUserIdAndPrefix.run).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: hashAppPasswordPrefix('abcdXefg') }),
        mockDb,
      );
    });

    it('updates last_used_at on successful verification', async () => {
      const passwordHash = await bcrypt.hash(testPassword, 10);

      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([
        {
          id: 1,
          external_id: VALID_PASSWORD_ID,
          password_hash: passwordHash,
        },
      ]);
      vi.mocked(updateAppPasswordLastUsed.run).mockResolvedValue([]);

      await service.verifyAppPassword(testEmail, testPassword);

      expect(updateAppPasswordLastUsed.run).toHaveBeenCalledWith({ id: 1 }, mockDb);
    });

    it('tries multiple passwords with same prefix', async () => {
      const wrongHash = await bcrypt.hash('wrong123wrong456wrong789', 10);
      const correctHash = await bcrypt.hash(testPassword, 10);

      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([
        {
          id: 1,
          external_id: 'first-password-id',
          password_hash: wrongHash,
        },
        {
          id: 2,
          external_id: VALID_PASSWORD_ID,
          password_hash: correctHash,
        },
      ]);
      vi.mocked(updateAppPasswordLastUsed.run).mockResolvedValue([]);

      const result = await service.verifyAppPassword(testEmail, testPassword);

      expect(result).toBeDefined();
      expect(result?.appPasswordId).toBe(VALID_PASSWORD_ID);
      expect(updateAppPasswordLastUsed.run).toHaveBeenCalledWith({ id: 2 }, mockDb);
    });

    it('extracts correct prefix from password', async () => {
      const password = 'abcd1234efgh5678';
      const passwordHash = await bcrypt.hash(password, 10);

      vi.mocked(getUserByEmailWithInternalId.run).mockResolvedValue([
        { id: 1, external_id: VALID_USER_ID, email: testEmail },
      ]);
      vi.mocked(getAppPasswordsByUserIdAndPrefix.run).mockResolvedValue([
        {
          id: 1,
          external_id: VALID_PASSWORD_ID,
          password_hash: passwordHash,
        },
      ]);
      vi.mocked(updateAppPasswordLastUsed.run).mockResolvedValue([]);

      await service.verifyAppPassword(testEmail, password);

      expect(getAppPasswordsByUserIdAndPrefix.run).toHaveBeenCalledWith(
        {
          userId: 1,
          prefix: hashAppPasswordPrefix('abcd1234'),
        },
        mockDb,
      );
    });
  });
});
