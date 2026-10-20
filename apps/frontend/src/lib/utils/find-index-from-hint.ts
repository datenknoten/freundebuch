import { ITEMS_PER_GROUP } from './keyboard-hint.js';

const DIGIT_HINT = /^[1-9]$/;
const LETTER_DIGIT_HINT = /^[a-z][1-9]$/;
const LETTER_A_CODE = 97;

/** The 0-based index a hint stands for, the inverse of `getKeyboardHint`; `undefined` for no hint. */
export function findIndexFromHint(hint: string) {
  if (DIGIT_HINT.test(hint) === true) {
    return Number(hint) - 1;
  }
  const lowerHint = hint.toLowerCase();
  if (LETTER_DIGIT_HINT.test(lowerHint) === false) {
    return undefined;
  }
  const letterIndex = lowerHint.charCodeAt(0) - LETTER_A_CODE;
  return (letterIndex + 1) * ITEMS_PER_GROUP + Number(lowerHint.charAt(1)) - 1;
}
