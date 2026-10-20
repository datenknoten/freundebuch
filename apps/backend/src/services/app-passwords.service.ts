import crypto from 'node:crypto';
import type { AppPasswordCreateResponse, AppPasswordResponse } from '@freundebuch/shared/index.js';
import bcrypt from 'bcrypt';
import type pg from 'pg';
import type { Logger } from 'pino';
import { AppPasswordCreationError } from '../errors/app-password-creation.error.js';
import { AppPasswordNotFoundError } from '../errors/app-password-not-found.error.js';
import { MaxAppPasswordsExceededError } from '../errors/max-app-passwords-exceeded.error.js';
import {
  createAppPassword,
  getAppPasswordsByUserExternalId,
  getAppPasswordsByUserIdAndPrefix,
  getUserByEmailWithInternalId,
  revokeAppPassword,
  updateAppPasswordLastUsed,
} from '../models/queries/app-passwords.queries.js';
import { hashAppPasswordPrefix } from '../utils/hash-app-password-prefix.js';

const SALT_ROUNDS = 10;
const PASSWORD_LENGTH = 24; // 24 bytes = 32 chars in base64url
const MAX_APP_PASSWORDS_PER_USER = 20;
const PREFIX_LENGTH = 8;

// Every rejected verification spends exactly one bcrypt round, including the
// paths that know the answer up front (unknown email, no stored prefix match).
// Without it, response time reveals which addresses have app passwords.
const DUMMY_HASH = bcrypt.hashSync('dummy', SALT_ROUNDS);

// Format: raw base64url password split into CHUNK-char chunks joined by '-'.
// A well-formatted input has length `chunks * CHUNK + (chunks - 1)` — i.e.
// `(length + 1) % (CHUNK + 1) === 0`. Separators sit at positions where
// `i % (CHUNK + 1) === CHUNK`. Kept as a constant so format/unformat stay
// in sync.
const FORMAT_CHUNK_SIZE = 4;
const FORMAT_STRIDE = FORMAT_CHUNK_SIZE + 1; // chunk + one separator

export interface AppPasswordsServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

export class AppPasswordsService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;

  constructor(options: AppPasswordsServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Format raw bytes as a readable password (xxxx-xxxx-xxxx-xxxx)
   */
  private formatPassword(password: string): string {
    const chunks: string[] = [];
    for (let i = 0; i < password.length; i += FORMAT_CHUNK_SIZE) {
      chunks.push(password.slice(i, i + FORMAT_CHUNK_SIZE));
    }
    return chunks.join('-');
  }

  /**
   * Invert formatPassword: remove only the separator dashes inserted at every
   * FORMAT_STRIDE-th position, preserving any '-' that are part of the
   * original base64url raw password (base64url alphabet includes '-').
   *
   * Fallback behavior: if the input either doesn't have a well-formatted length
   * or has a non-dash character at a separator slot, fall back to stripping
   * all dashes. This preserves legacy behavior for malformed input — garbage
   * into bcrypt simply fails the compare and produces a 401.
   */
  private unformatPassword(input: string): string {
    const hasWellFormattedLength =
      input.length >= FORMAT_STRIDE && (input.length + 1) % FORMAT_STRIDE === 0;
    if (!hasWellFormattedLength) {
      return input.replace(/-/g, '');
    }
    let out = '';
    for (let i = 0; i < input.length; i++) {
      if (i % FORMAT_STRIDE === FORMAT_CHUNK_SIZE) {
        if (input[i] !== '-') {
          return input.replace(/-/g, '');
        }
        continue;
      }
      out += input[i];
    }
    return out;
  }

  /**
   * List all active app passwords for a user
   */
  public async listAppPasswords(userExternalId: string): Promise<AppPasswordResponse[]> {
    this.logger.debug({ userId: userExternalId }, 'Listing app passwords');

    const results = await getAppPasswordsByUserExternalId.run({ userExternalId }, this.db);

    return results.map((row) => ({
      externalId: row.external_id,
      name: row.name,
      lastUsedAt: row.last_used_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Create a new app password
   * Returns the password only once - it cannot be retrieved later
   * @throws MaxAppPasswordsExceededError if user has too many app passwords
   */
  public async createAppPassword(
    userExternalId: string,
    name: string,
  ): Promise<AppPasswordCreateResponse> {
    this.logger.info({ userId: userExternalId }, 'Creating app password');

    // Check if user has reached the maximum number of app passwords
    const existingPasswords = await this.listAppPasswords(userExternalId);
    if (existingPasswords.length >= MAX_APP_PASSWORDS_PER_USER) {
      this.logger.warn(
        { userId: userExternalId, count: existingPasswords.length },
        'User has reached maximum app passwords limit',
      );
      throw new MaxAppPasswordsExceededError(MAX_APP_PASSWORDS_PER_USER);
    }

    // Generate a random password
    const rawPassword = crypto.randomBytes(PASSWORD_LENGTH).toString('base64url');
    const password = this.formatPassword(rawPassword);
    const passwordPrefix = rawPassword.substring(0, PREFIX_LENGTH);
    const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const results = await createAppPassword.run(
      {
        userExternalId,
        name,
        passwordHash,
        passwordPrefix: hashAppPasswordPrefix(passwordPrefix),
      },
      this.db,
    );

    const row = results[0];
    if (!row) {
      this.logger.error({ userId: userExternalId }, 'Failed to create app password');
      throw new AppPasswordCreationError();
    }

    this.logger.info(
      { userId: userExternalId, passwordId: row.external_id },
      'App password created',
    );

    return {
      externalId: row.external_id,
      name: row.name,
      // The raw prefix, straight from the password we just generated — the
      // stored column only holds its hash.
      passwordPrefix,
      password, // Only returned once!
      lastUsedAt: null,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Revoke an app password (soft delete)
   */
  public async revokeAppPassword(userExternalId: string, appPasswordExternalId: string) {
    this.logger.info(
      { userId: userExternalId, passwordId: appPasswordExternalId },
      'Revoking app password',
    );

    const results = await revokeAppPassword.run(
      {
        userExternalId,
        appPasswordExternalId,
      },
      this.db,
    );

    if (results.length === 0) {
      this.logger.warn(
        { userId: userExternalId, passwordId: appPasswordExternalId },
        'App password not found or already revoked',
      );
      throw new AppPasswordNotFoundError(appPasswordExternalId);
    }

    this.logger.info(
      { userId: userExternalId, passwordId: appPasswordExternalId },
      'App password revoked',
    );
  }

  /**
   * Verify an app password for HTTP Basic Auth
   * Used by CardDAV/CalDAV authentication
   * Returns user info if valid, undefined if not authenticated
   */
  public async verifyAppPassword(email: string, password: string) {
    this.logger.debug('Verifying app password');

    // Invert formatPassword to recover the raw base64url password. Must preserve
    // '-' characters that are part of the base64url alphabet; only strip the
    // dashes inserted as separators by formatPassword.
    const rawPassword = this.unformatPassword(password);
    const prefix = hashAppPasswordPrefix(rawPassword.substring(0, PREFIX_LENGTH));

    // Emails are stored lowercase (CHECK constraint on both identity tables);
    // DAV/MCP clients send whatever the user typed.
    const [user] = await getUserByEmailWithInternalId.run({ email: email.toLowerCase() }, this.db);
    if (user === undefined) {
      // Spend the same bcrypt round a real candidate would have cost.
      await bcrypt.compare(rawPassword, DUMMY_HASH);
      this.logger.warn('User not found for app password verification');
      return undefined;
    }

    // Find matching app passwords by prefix
    const appPasswords = await getAppPasswordsByUserIdAndPrefix.run(
      {
        userId: user.id,
        prefix,
      },
      this.db,
    );

    if (appPasswords.length === 0) {
      await bcrypt.compare(rawPassword, DUMMY_HASH);
      this.logger.warn('Invalid app password');
      return undefined;
    }

    // Try each matching password
    for (const ap of appPasswords) {
      const isValid = await bcrypt.compare(rawPassword, ap.password_hash);

      if (isValid === true) {
        // Update last_used_at
        await updateAppPasswordLastUsed.run({ id: ap.id }, this.db);

        this.logger.info({ passwordId: ap.external_id }, 'App password verified successfully');

        return {
          userId: user.external_id,
          email: user.email,
          appPasswordId: ap.external_id,
        };
      }
    }

    this.logger.warn('Invalid app password');
    return undefined;
  }
}
