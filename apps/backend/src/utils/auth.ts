import crypto from 'node:crypto';
import { type } from 'arktype';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getConfig } from './config.ts';

const SALT_ROUNDS = 10;

const JWTPayloadSchema = type({
  userId: 'string',
  email: 'string',
});

type JWTPayload = typeof JWTPayloadSchema.infer;

/**
 * For now this is OK, will expand later.
 */
const PasswordSchema = type('string > 8');

class WeakPasswordError extends Error {
  public constructor(public reason: string) {
    super();
  }
}

class InvalidPayloadError extends Error {}

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

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: unknown): string {
  const config = getConfig();

  const content = JWTPayloadSchema(payload);

  if (content instanceof type.errors) {
    throw new InvalidPayloadError();
  }

  return jwt.sign(content, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRY,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const config = getConfig();
    const content = JWTPayloadSchema(jwt.verify(token, config.JWT_SECRET));

    if (content instanceof type.errors) {
      return null;
    }

    return content;
  } catch {
    return null;
  }
}

/**
 * Generate a secure random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a session token using SHA-256
 * Returns the hash as a hex string for storage in the database
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate session expiry date
 */
export function getSessionExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7); // 7 days from now
  return expiry;
}
