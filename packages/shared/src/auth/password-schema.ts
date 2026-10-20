import { type Traversal, type } from 'arktype';

function checkCharacterClasses(password: string, ctx: Traversal) {
  if (
    /[a-z]/.test(password) === true &&
    /[A-Z]/.test(password) === true &&
    /[0-9]/.test(password) === true
  ) {
    return true;
  }
  return ctx.mustBe('a password with a lowercase letter, an uppercase letter and a digit');
}

export const PasswordSchema = type('string >= 8').narrow(checkCharacterClasses);
