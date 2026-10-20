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
