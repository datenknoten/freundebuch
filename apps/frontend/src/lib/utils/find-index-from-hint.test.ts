import { describe, expect, it } from 'vitest';
import { findIndexFromHint } from './find-index-from-hint.js';
import { getKeyboardHint, ITEMS_PER_GROUP } from './keyboard-hint.js';

describe('findIndexFromHint', () => {
  describe('with a valid hint', () => {
    it('maps the digits 1-9 to the indices 0-8', () => {
      expect([findIndexFromHint('1'), findIndexFromHint('9')]).toEqual([0, 8]);
    });

    it('maps a letter and a digit to the index in that group', () => {
      expect([findIndexFromHint('a1'), findIndexFromHint('b1')]).toEqual([9, 18]);
    });

    it('accepts an upper-case letter', () => {
      expect(findIndexFromHint('B5')).toBe(22);
    });

    it('inverts getKeyboardHint for the first five groups', () => {
      const indices = Array.from({ length: ITEMS_PER_GROUP * 5 }, (_value, index) => index);

      expect(indices.map((index) => findIndexFromHint(getKeyboardHint(index)))).toEqual(indices);
    });
  });

  describe('with something that is no hint', () => {
    it.each(['0', 'x', 'a0', '10', 'aa', 'a10', ''])('returns undefined for %j', (hint) => {
      expect(findIndexFromHint(hint)).toBeUndefined();
    });
  });
});
