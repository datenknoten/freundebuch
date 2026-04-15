import { PasswordSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const validPassword = PasswordSchema(password);

  if (validPassword instanceof type.errors) {
    throw new WeakPasswordError(validPassword.summary);
  }

  return bcrypt.hash(validPassword, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

class WeakPasswordError extends Error {
  public reason: string;
  public constructor(reason: string) {
    super();
    this.reason = reason;
  }
}
