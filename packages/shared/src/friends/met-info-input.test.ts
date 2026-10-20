import { describe, expect, it } from 'vitest';
import { MetInfoInputSchema } from './met-info-input.js';

describe('MetInfoInputSchema', () => {
  describe('with valid input', () => {
    it('accepts an ISO met_date', () => {
      const result = MetInfoInputSchema({ met_date: '2019-08-01', met_location: 'Berlin' });
      expect(result).toEqual({ met_date: '2019-08-01', met_location: 'Berlin' });
    });

    it('accepts null to clear the date', () => {
      const result = MetInfoInputSchema({ met_date: null });
      expect(result).toEqual({ met_date: null });
    });

    it('accepts an omitted date', () => {
      const result = MetInfoInputSchema({ met_location: 'Berlin' });
      expect(result).toEqual({ met_location: 'Berlin' });
    });
  });

  describe('with an invalid met_date', () => {
    it('rejects an empty met_date instead of forwarding it to the date column', () => {
      const result = MetInfoInputSchema({ met_date: '' });
      expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
    });

    it('rejects a non-ISO met_date', () => {
      const result = MetInfoInputSchema({ met_date: 'summer 2019' });
      expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
    });
  });
});
