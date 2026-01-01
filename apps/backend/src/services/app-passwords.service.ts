import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  createAppPassword,
  getAppPasswordsByUserExternalId,
  getAppPasswordsByUserIdAndPrefix,
  getUserByEmailWithInternalId,
  revokeAppPassword,
  updateAppPasswordLastUsed,
} from '../models/queries/app-passwords.queries.js';

const SALT_ROUNDS = 10;
const PASSWORD_LENGTH = 24; // 24 bytes = 32 chars in base64url

export interface AppPassword {
  externalId: string;
  name: string;
  passwordPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface AppPasswordWithSecret extends AppPassword {
  password: string; // Only returned at creation time
}

export interface BasicAuthContext {
  userId: string; // User's external_id
  email: string;
  appPasswordId: string; // App password external_id
}

export class AppPasswordsService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(db: pg.Pool, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Format raw bytes as a readable password (xxxx-xxxx-xxxx-xxxx)
   */
  private formatPassword(password: string): string {
    // Split into chunks of 4 characters and join with dashes
    const chunks: string[] = [];
    for (let i = 0; i < password.length; i += 4) {
      chunks.push(password.slice(i, i + 4));
    }
    return chunks.join('-');
  }

  /**
   * List all active app passwords for a user
   */
  async listAppPasswords(userExternalId: string): Promise<AppPassword[]> {
    this.logger.debug({ userId: userExternalId }, 'Listing app passwords');

    const results = await getAppPasswordsByUserExternalId.run({ userExternalId }, this.db);

    return results.map((row) => ({
      externalId: row.external_id,
      name: row.name,
      passwordPrefix: row.password_prefix,
      lastUsedAt: row.last_used_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Create a new app password
   * Returns the password only once - it cannot be retrieved later
   */
  async createAppPassword(userExternalId: string, name: string): Promise<AppPasswordWithSecret> {
    this.logger.info({ userId: userExternalId, name }, 'Creating app password');

    // Generate a random password
    const rawPassword = crypto.randomBytes(PASSWORD_LENGTH).toString('base64url');
    const password = this.formatPassword(rawPassword);
    const passwordPrefix = rawPassword.substring(0, 8);
    const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const results = await createAppPassword.run(
      {
        userExternalId,
        name,
        passwordHash,
        passwordPrefix,
      },
      this.db,
    );

    const row = results[0];
    if (!row) {
      this.logger.error({ userId: userExternalId }, 'Failed to create app password');
      throw new Error('Failed to create app password');
    }

    this.logger.info(
      { userId: userExternalId, passwordId: row.external_id },
      'App password created',
    );

    return {
      externalId: row.external_id,
      name: row.name,
      passwordPrefix: row.password_prefix,
      password, // Only returned once!
      lastUsedAt: null,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Revoke an app password (soft delete)
   */
  async revokeAppPassword(userExternalId: string, appPasswordExternalId: string): Promise<boolean> {
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
      return false;
    }

    this.logger.info(
      { userId: userExternalId, passwordId: appPasswordExternalId },
      'App password revoked',
    );

    return true;
  }

  /**
   * Verify an app password for HTTP Basic Auth
   * Used by CardDAV/CalDAV authentication
   * Returns user info if valid, null if invalid
   */
  async verifyAppPassword(email: string, password: string): Promise<BasicAuthContext | null> {
    this.logger.debug({ email }, 'Verifying app password');

    // Remove dashes from formatted password
    const rawPassword = password.replace(/-/g, '');
    const prefix = rawPassword.substring(0, 8);

    // Get user by email
    const users = await getUserByEmailWithInternalId.run({ email }, this.db);

    const user = users[0];
    if (!user) {
      this.logger.warn({ email }, 'User not found for app password verification');
      return null;
    }

    // Find matching app passwords by prefix
    const appPasswords = await getAppPasswordsByUserIdAndPrefix.run(
      {
        userId: user.id,
        prefix,
      },
      this.db,
    );

    // Try each matching password
    for (const ap of appPasswords) {
      const isValid = await bcrypt.compare(rawPassword, ap.password_hash);

      if (isValid) {
        // Update last_used_at
        await updateAppPasswordLastUsed.run({ id: ap.id }, this.db);

        this.logger.info(
          { email, passwordId: ap.external_id },
          'App password verified successfully',
        );

        return {
          userId: user.external_id,
          email: user.email,
          appPasswordId: ap.external_id,
        };
      }
    }

    this.logger.warn({ email }, 'Invalid app password');
    return null;
  }
}
