/** Items per hint group: digits 1–9, then `a1`–`a9`, `b1`–`b9` … */
export const ITEMS_PER_GROUP = 9;

const LETTER_A_CODE = 97;

/** The hint of the item at a 0-based index: `0` → `"1"`, `9` → `"a1"`, `18` → `"b1"`. */
export function getKeyboardHint(index: number) {
  if (index < ITEMS_PER_GROUP) {
    return String(index + 1);
  }
  const letterIndex = Math.floor(index / ITEMS_PER_GROUP) - 1;
  const numberInGroup = (index % ITEMS_PER_GROUP) + 1;
  return `${String.fromCharCode(LETTER_A_CODE + letterIndex)}${numberInGroup}`;
}
