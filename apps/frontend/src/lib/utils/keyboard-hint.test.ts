import { describe, expect, it } from 'vitest';
import { getKeyboardHint } from './keyboard-hint.js';

describe('getKeyboardHint', () => {
  describe('in the first group', () => {
    it('uses the bare digits 1-9 for the first nine items', () => {
      expect([getKeyboardHint(0), getKeyboardHint(8)]).toEqual(['1', '9']);
    });
  });

  describe('in a later group', () => {
    it('prefixes the digit with the letter of the group', () => {
      expect([getKeyboardHint(9), getKeyboardHint(17), getKeyboardHint(18)]).toEqual([
        'a1',
        'a9',
        'b1',
      ]);
    });
  });
});
