import crypto from 'node:crypto';
import { PasswordSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import bcrypt from 'bcrypt';
import type { CookieOptions } from 'hono/utils/cookie';
import jwt from 'jsonwebtoken';
import { getConfig } from './config.js';

const SALT_ROUNDS = 10;

const JWTPayloadSchema = type({
  userId: 'string',
  email: 'string',
});

type JWTPayload = typeof JWTPayloadSchema.infer;

class WeakPasswordError extends Error {
  public reason: string;
  public constructor(reason: string) {
    super();
    this.reason = reason;
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

  // Add jti (JWT ID) for uniqueness - ensures each token is unique even if issued in the same second
  const jti = crypto.randomBytes(16).toString('hex');

  return jwt.sign({ ...content, jti }, config.JWT_SECRET, {
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
 * Calculate session expiry date (uses config)
 */
export function getSessionExpiry(): Date {
  const config = getConfig();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + config.SESSION_EXPIRY_DAYS);
  return expiry;
}

/**
 * Generate a secure random password reset token
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate password reset token expiry date (uses config)
 */
export function getPasswordResetExpiry(): Date {
  const config = getConfig();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + config.PASSWORD_RESET_EXPIRY_HOURS);
  return expiry;
}

/**
 * Get standard session cookie options
 */
export function getSessionCookieOptions(): CookieOptions {
  const config = getConfig();
  return {
    httpOnly: true,
    secure: config.ENV === 'production',
    sameSite: 'Lax',
    maxAge: config.SESSION_EXPIRY_DAYS * 24 * 60 * 60, // Convert days to seconds
    path: '/',
  };
}

/**
 * Get cookie options for clearing a session cookie
 */
export function getClearCookieOptions(): CookieOptions {
  const config = getConfig();
  return {
    httpOnly: true,
    secure: config.ENV === 'production',
    sameSite: 'Lax',
    maxAge: 0,
    path: '/',
  };
}
