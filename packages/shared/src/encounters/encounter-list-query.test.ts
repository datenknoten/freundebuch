import { describe, expect, it } from 'vitest';
import { EncounterListQuerySchema } from './encounter-list-query.js';

describe('EncounterListQuerySchema', () => {
  describe('with valid input', () => {
    it('treats an empty date filter as absent', () => {
      const result = EncounterListQuerySchema({ from_date: '', to_date: '' });
      expect(result).toEqual({ from_date: '', to_date: '' });
    });

    it('accepts YYYY-MM-DD date filters', () => {
      const result = EncounterListQuerySchema({ from_date: '2025-01-01', to_date: '2025-12-31' });
      expect(result).toEqual({ from_date: '2025-01-01', to_date: '2025-12-31' });
    });
  });

  describe('with a malformed date filter', () => {
    it('rejects a malformed from_date instead of casting it in SQL', () => {
      const result = EncounterListQuerySchema({ from_date: 'last-tuesday' });
      expect(result.summary).toContain('from_date');
    });

    it('rejects a malformed to_date instead of casting it in SQL', () => {
      const result = EncounterListQuerySchema({ to_date: '31.12.2025' });
      expect(result.summary).toContain('to_date');
    });
  });
});
