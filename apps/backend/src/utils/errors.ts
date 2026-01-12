import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Custom error classes for the backend application.
 *
 * Using custom error classes provides several benefits:
 * - Better error categorization and handling
 * - Improved error messages and debugging
 * - Type-safe error handling in catch blocks
 * - Better Sentry/logging integration
 */

/**
 * Base class for all application errors.
 * Provides a consistent structure for error handling.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: ContentfulStatusCode;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ============================================================================
// Authentication Errors (401)
// ============================================================================

/**
 * Thrown when authentication fails due to invalid credentials.
 * This is a generic error to prevent user enumeration attacks.
 */
export class AuthenticationError extends AppError {
  readonly statusCode = 401;

  constructor(message = 'Invalid credentials') {
    super(message);
  }
}

/**
 * Thrown when a session is invalid or has expired.
 */
export class InvalidSessionError extends AppError {
  readonly statusCode = 401;

  constructor(message = 'Invalid or expired session') {
    super(message);
  }
}

/**
 * Thrown when a password reset token is invalid or has expired.
 */
export class InvalidTokenError extends AppError {
  readonly statusCode = 401;

  constructor(message = 'Invalid or expired token') {
    super(message);
  }
}

// ============================================================================
// Resource Not Found Errors (404)
// ============================================================================

/**
 * Thrown when a user is not found in the database.
 */
export class UserNotFoundError extends AppError {
  readonly statusCode = 404;

  constructor(message = 'User not found') {
    super(message);
  }
}

/**
 * Thrown when a contact is not found in the database.
 */
export class ContactNotFoundError extends AppError {
  readonly statusCode = 404;

  constructor(message = 'Contact not found') {
    super(message);
  }
}

// ============================================================================
// Conflict Errors (409)
// ============================================================================

/**
 * Thrown when attempting to register a user that already exists.
 */
export class UserAlreadyExistsError extends AppError {
  readonly statusCode = 409;

  constructor(message = 'User already exists') {
    super(message);
  }
}

/**
 * Thrown when attempting to add a birthday to a contact that already has one.
 */
export class BirthdayAlreadyExistsError extends AppError {
  readonly statusCode = 409;

  constructor(message = 'Contact already has a birthday date') {
    super(message);
  }
}

// ============================================================================
// Internal Server Errors (500)
// ============================================================================

/**
 * Thrown when user creation fails unexpectedly.
 */
export class UserCreationError extends AppError {
  readonly statusCode = 500;

  constructor(message = 'Failed to create user') {
    super(message);
  }
}

/**
 * Thrown when contact creation fails unexpectedly.
 */
export class ContactCreationError extends AppError {
  readonly statusCode = 500;

  constructor(message = 'Failed to create contact') {
    super(message);
  }
}

/**
 * Thrown when app password creation fails unexpectedly.
 */
export class AppPasswordCreationError extends AppError {
  readonly statusCode = 500;

  constructor(message = 'Failed to create app password') {
    super(message);
  }
}

/**
 * Thrown when user preferences update fails unexpectedly.
 */
export class PreferencesUpdateError extends AppError {
  readonly statusCode = 500;

  constructor(message = 'Failed to update preferences') {
    super(message);
  }
}

/**
 * Thrown when the database connection is not available.
 */
export class DatabaseConnectionError extends AppError {
  readonly statusCode = 500;

  constructor(message = 'No database connection') {
    super(message);
  }
}

/**
 * Thrown when configuration validation fails.
 */
export class ConfigurationError extends AppError {
  readonly statusCode = 500;
}

// ============================================================================
// External Service Errors (502)
// ============================================================================

/**
 * Thrown when an external API service is unavailable or returns an error.
 */
export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly service: string;
  readonly originalStatus?: number;

  constructor(service: string, message: string, originalStatus?: number) {
    super(message);
    this.service = service;
    this.originalStatus = originalStatus;
  }
}

/**
 * Thrown when the Overpass API is unavailable or returns an error.
 */
export class OverpassApiError extends ExternalServiceError {
  constructor(message = 'Overpass API unavailable', originalStatus?: number) {
    super('Overpass', message, originalStatus);
  }
}

/**
 * Thrown when the ZipcodeBase API returns an error.
 */
export class ZipcodeBaseApiError extends ExternalServiceError {
  constructor(message: string, originalStatus?: number) {
    super('ZipcodeBase', message, originalStatus);
  }
}

// ============================================================================
// Helper function for type-safe error checking
// ============================================================================

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Thrown when an unknown value is caught in a catch block.
 * Wraps non-Error values to preserve the original value for debugging.
 */
export class UnknownValueError extends AppError {
  readonly statusCode = 500;
  readonly originalValue: unknown;

  constructor(value: unknown) {
    super(String(value));
    this.originalValue = value;
  }
}

/**
 * Get the HTTP status code for an error.
 * Returns 500 for non-AppError errors.
 */
export function getErrorStatusCode(error: unknown): ContentfulStatusCode {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}

/**
 * Normalize an unknown error to an Error instance.
 * Useful in catch blocks where the error type is unknown.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new UnknownValueError(error);
}
