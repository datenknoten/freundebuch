import { describe, expect, it } from 'vitest';
import { hasHintGroup } from './has-hint-group.js';

describe('hasHintGroup', () => {
  describe('with the letter a', () => {
    it('needs a tenth item', () => {
      expect([hasHintGroup('a', 9), hasHintGroup('a', 10)]).toEqual([false, true]);
    });
  });

  describe('with a later letter', () => {
    it('needs one item past the groups before it', () => {
      expect([hasHintGroup('b', 18), hasHintGroup('b', 19)]).toEqual([false, true]);
    });
  });
});
