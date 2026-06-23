import { describe, expect, it } from 'vitest';
import { getIndexFromHint, getKeyboardHint, ITEMS_PER_GROUP } from './ui.js';

describe('keyboard hint helpers', () => {
  describe('getKeyboardHint', () => {
    it('uses bare digits 1-9 for the first group', () => {
      expect(getKeyboardHint(0)).toBe('1');
      expect(getKeyboardHint(8)).toBe('9');
    });

    it('uses a letter+digit for later groups', () => {
      expect(getKeyboardHint(9)).toBe('a1');
      expect(getKeyboardHint(17)).toBe('a9');
      expect(getKeyboardHint(18)).toBe('b1');
    });
  });

  describe('getIndexFromHint', () => {
    it('maps single digits 1-9 to indices 0-8', () => {
      expect(getIndexFromHint('1')).toBe(0);
      expect(getIndexFromHint('9')).toBe(8);
    });

    it('maps letter+digit hints to the right index', () => {
      expect(getIndexFromHint('a1')).toBe(9);
      expect(getIndexFromHint('b1')).toBe(18);
    });

    it('returns -1 for invalid hints', () => {
      expect(getIndexFromHint('0')).toBe(-1);
      expect(getIndexFromHint('x')).toBe(-1);
      expect(getIndexFromHint('a0')).toBe(-1);
      expect(getIndexFromHint('10')).toBe(-1);
      expect(getIndexFromHint('aa')).toBe(-1);
      expect(getIndexFromHint('a10')).toBe(-1);
    });
  });

  it('getIndexFromHint is the inverse of getKeyboardHint', () => {
    for (let i = 0; i < ITEMS_PER_GROUP * 5; i++) {
      expect(getIndexFromHint(getKeyboardHint(i))).toBe(i);
    }
  });
});
