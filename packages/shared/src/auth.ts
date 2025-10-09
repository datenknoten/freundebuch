import { type } from 'arktype';

/**
 * Request/Response types for authentication endpoints
 */

// Email regex pattern - RFC 5322 simplified
// Allows alphanumeric, dots, hyphens, underscores, plus signs, but not < > or other special HTML chars
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const PasswordSchema = type('string >= 8').narrow((password): password is string => {
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return hasLowercase && hasUppercase && hasDigit;
});

// Email type with validation
const emailType = type('string>0').narrow((s): s is string => {
  if (!emailPattern.test(s)) {
    return false;
  }
  return true;
});

// Register request schema
export const RegisterRequestSchema = type({
  email: emailType,
  password: PasswordSchema,
});

export type RegisterRequest = typeof RegisterRequestSchema.infer;

// Login request schema
export const LoginRequestSchema = type({
  email: emailType,
  password: 'string>0',
});

export type LoginRequest = typeof LoginRequestSchema.infer;

// User type
export interface User {
  externalId: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

// Auth response (for login/register/refresh)
export interface AuthResponse {
  user: User;
  accessToken: string;
  sessionToken: string;
}

// Refresh request schema
export const RefreshRequestSchema = type({
  'sessionToken?': 'string',
});

export type RefreshRequest = typeof RefreshRequestSchema.infer;

// Update profile request schema
export const UpdateProfileRequestSchema = type({
  'email?': emailType,
});

export type UpdateProfileRequest = typeof UpdateProfileRequestSchema.infer;

// Forgot password request schema
export const ForgotPasswordRequestSchema = type({
  email: emailType,
});

export type ForgotPasswordRequest = typeof ForgotPasswordRequestSchema.infer;

// Reset password request schema
export const ResetPasswordRequestSchema = type({
  token: 'string',
  password: PasswordSchema,
});

export type ResetPasswordRequest = typeof ResetPasswordRequestSchema.infer;

// Error response
export interface ErrorResponse {
  error: string;
  details?: unknown;
}
