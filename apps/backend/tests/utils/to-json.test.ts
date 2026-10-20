import { describe, expect, it } from 'vitest';
import { DataIntegrityError } from '../../src/errors/data-integrity.error.js';
import { toJson } from '../../src/utils/to-json.js';

describe('toJson', () => {
  describe('with an object', () => {
    it('drops undefined, function and symbol properties like JSON.stringify', () => {
      const value = { a: 1, b: undefined, c: Math.max, d: Symbol('x'), e: null };

      expect(toJson(value)).toEqual({ a: 1, e: null });
    });

    it('converts nested arrays, dates and non-finite numbers like JSON.stringify', () => {
      const value = {
        list: ['x', undefined, Number.NaN, { y: true }],
        at: new Date('2026-01-02T03:04:05.000Z'),
        limit: Number.POSITIVE_INFINITY,
      };

      expect(toJson(value)).toEqual({
        list: ['x', null, null, { y: true }],
        at: '2026-01-02T03:04:05.000Z',
        limit: null,
      });
    });
  });

  describe('with a value JSON cannot represent', () => {
    it('throws a DataIntegrityError for undefined', () => {
      expect(() => toJson(undefined)).toThrow(DataIntegrityError);
    });

    it('throws a DataIntegrityError for a bigint', () => {
      expect(() => toJson({ big: 1n })).toThrow(DataIntegrityError);
    });
  });
});
