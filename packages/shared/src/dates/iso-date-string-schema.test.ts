import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { IsoDateFilterSchema } from './iso-date-filter-schema.js';
import { IsoDateStringSchema } from './iso-date-string-schema.js';

describe('IsoDateStringSchema', () => {
  describe('with a YYYY-MM-DD string', () => {
    it('accepts the date unchanged', () => {
      expect(IsoDateStringSchema('2024-02-29')).toBe('2024-02-29');
    });
  });

  describe('with any other shape', () => {
    it.each(['', '2024-2-29', '29.02.2024', '2024-02-29T00:00:00Z', ' 2024-02-29'])(
      'rejects %j',
      (value) => {
        expect(IsoDateStringSchema(value)).toBeInstanceOf(type.errors);
      },
    );

    it('describes the expected format in the error', () => {
      expect(String(IsoDateStringSchema('nope'))).toContain('YYYY-MM-DD');
    });
  });
});

describe('IsoDateFilterSchema', () => {
  describe('with an empty string', () => {
    it('accepts it as no filter', () => {
      expect(IsoDateFilterSchema('')).toBe('');
    });
  });

  describe('with a malformed date', () => {
    it('rejects it', () => {
      expect(IsoDateFilterSchema('2024/01/01')).toBeInstanceOf(type.errors);
    });
  });
});
