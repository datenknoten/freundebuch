import { describe, expect, it } from 'vitest';
import { ProfessionalHistoryInputSchema } from './professional-history-input.js';

describe('ProfessionalHistoryInputSchema', () => {
  it('accepts an entry with job_title only', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 1,
      from_year: 2020,
    });
    expect(result).toEqual({
      job_title: 'Engineer',
      from_month: 1,
      from_year: 2020,
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
    });
  });

  it('rejects an entry with neither job_title nor organization', () => {
    const result = ProfessionalHistoryInputSchema({
      from_month: 1,
      from_year: 2020,
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a professional history entry with either job_title or organization (was {"from_month":1,"from_year":2020})"`,
    );
  });

  it('rejects an invalid month', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 13,
      from_year: 2020,
    });
    expect(result.summary).toMatchInlineSnapshot(`"from_month must be at most 12 (was 13)"`);
  });

  it('rejects to_month without to_year', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 1,
      from_year: 2020,
      to_month: 6,
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a professional history entry with both to_month and to_year set or both null (was {"job_title":"Engineer","from_month":1,"from_year":2020,"to_month":6})"`,
    );
  });

  it('rejects end date before start date', () => {
    const result = ProfessionalHistoryInputSchema({
      job_title: 'Engineer',
      from_month: 6,
      from_year: 2020,
      to_month: 1,
      to_year: 2020,
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a professional history entry with end date after or equal to start date (was {"job_title":"Engineer","from_month":6,"from_year":2020,"to_month":1,"to_year":2020})"`,
    );
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
    });
  });
});
