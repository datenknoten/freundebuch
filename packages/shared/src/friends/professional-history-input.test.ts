import { describe, expect, it } from 'vitest';
import { ProfessionalHistoryInputSchema } from './professional-history-input.js';

describe('ProfessionalHistoryInputSchema', () => {
  describe('with valid input', () => {
    it('accepts an entry with job_title only and defaults is_primary to false', () => {
      const result = ProfessionalHistoryInputSchema({
        job_title: 'Engineer',
        from_month: 1,
        from_year: 2020,
      });
      expect(result).toEqual({
        job_title: 'Engineer',
        from_month: 1,
        from_year: 2020,
        is_primary: false,
      });
    });

    it('accepts an entry with organization only', () => {
      const result = ProfessionalHistoryInputSchema({
        organization: 'Acme Corp',
        from_month: 6,
        from_year: 2019,
      });
      expect(result).toEqual({
        organization: 'Acme Corp',
        from_month: 6,
        from_year: 2019,
        is_primary: false,
      });
    });

    it('accepts equal start and end dates', () => {
      const result = ProfessionalHistoryInputSchema({
        job_title: 'Engineer',
        from_month: 6,
        from_year: 2020,
        to_month: 6,
        to_year: 2020,
      });
      expect(result).toEqual({
        job_title: 'Engineer',
        from_month: 6,
        from_year: 2020,
        to_month: 6,
        to_year: 2020,
        is_primary: false,
      });
    });
  });

  describe('with neither job_title nor organization', () => {
    it('rejects an entry with neither job_title nor organization', () => {
      const result = ProfessionalHistoryInputSchema({
        from_month: 1,
        from_year: 2020,
      });
      expect(result.summary).toMatchInlineSnapshot(
        `"must be a professional history entry with either job_title or organization (was {"from_month":1,"from_year":2020,"is_primary":false})"`,
      );
    });
  });

  describe('with an out-of-range month', () => {
    it('rejects an invalid month', () => {
      const result = ProfessionalHistoryInputSchema({
        job_title: 'Engineer',
        from_month: 13,
        from_year: 2020,
      });
      expect(result.summary).toMatchInlineSnapshot(`"from_month must be at most 12 (was 13)"`);
    });
  });

  describe('with an incomplete end date', () => {
    it('rejects to_month without to_year', () => {
      const result = ProfessionalHistoryInputSchema({
        job_title: 'Engineer',
        from_month: 1,
        from_year: 2020,
        to_month: 6,
      });
      expect(result.summary).toMatchInlineSnapshot(
        `"must be a professional history entry with both to_month and to_year set or both null (was {"job_title":"Engineer","from_month":1,"from_year":2020,"to_month":6,"is_primary":false})"`,
      );
    });
  });

  describe('when the end date precedes the start date', () => {
    it('rejects the entry', () => {
      const result = ProfessionalHistoryInputSchema({
        job_title: 'Engineer',
        from_month: 6,
        from_year: 2020,
        to_month: 1,
        to_year: 2020,
      });
      expect(result.summary).toMatchInlineSnapshot(
        `"must be a professional history entry with end date after or equal to start date (was {"job_title":"Engineer","from_month":6,"from_year":2020,"to_month":1,"to_year":2020,"is_primary":false})"`,
      );
    });
  });
});
