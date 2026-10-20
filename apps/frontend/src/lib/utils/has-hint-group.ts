import { ITEMS_PER_GROUP } from './keyboard-hint.js';

const LETTER_A_CODE = 97;

/** Whether a list of `itemCount` items has hints that start with `letter` (`b` needs 19 items). */
export function hasHintGroup(letter: string, itemCount: number) {
  const letterIndex = letter.charCodeAt(0) - LETTER_A_CODE;
  return (letterIndex + 1) * ITEMS_PER_GROUP < itemCount;
}
