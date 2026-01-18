import { type } from 'arktype';

/**
 * Request/Response types for authentication endpoints
 */

export const PasswordSchema = type('string >= 8').narrow((password): password is string => {
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return hasLowercase && hasUppercase && hasDigit;
});

// Email type with validation using ArkType's built-in string.email
const emailType = type('string.email');

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

// User preferences schema and type
export const PageSizeSchema = type('10 | 25 | 50 | 100');
export type PageSize = typeof PageSizeSchema.infer;

export const BirthdayFormatSchema = type("'iso' | 'us' | 'eu' | 'long'");
export type BirthdayFormat = typeof BirthdayFormatSchema.infer;

export const LanguageSchema = type("'en' | 'de'");
export type Language = typeof LanguageSchema.infer;

export const UserPreferencesSchema = type({
  'friendsPageSize?': PageSizeSchema,
  'friendsTableColumns?': 'string[]',
  'birthdayFormat?': BirthdayFormatSchema,
  'language?': LanguageSchema,
});
export type UserPreferences = typeof UserPreferencesSchema.infer;

export const UpdatePreferencesRequestSchema = type({
  'friendsPageSize?': PageSizeSchema,
  'friendsTableColumns?': 'string[]',
  'birthdayFormat?': BirthdayFormatSchema,
  'language?': LanguageSchema,
});
export type UpdatePreferencesRequest = typeof UpdatePreferencesRequestSchema.infer;

// User type
export interface User {
  externalId: string;
  email: string;
  preferences?: UserPreferences;
  createdAt?: string;
  updatedAt?: string;
  /** External ID of the user's self-profile (if set) */
  selfProfileId?: string;
  /** Whether the user has completed onboarding (has a self-profile) */
  hasCompletedOnboarding: boolean;
}

/** Error code returned when user hasn't completed onboarding */
export const ONBOARDING_REQUIRED_CODE = 'ONBOARDING_REQUIRED';

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
  code?: string;
  details?: unknown;
}
