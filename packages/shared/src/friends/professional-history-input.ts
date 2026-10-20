import { type } from 'arktype';

// Professional History input schema

/** Schema for creating/updating a professional history entry */
export const ProfessionalHistoryInputSchema = type({
  'job_title?': 'string | null',
  'organization?': 'string | null',
  'department?': 'string | null',
  'notes?': 'string | null',
  from_month: '1 <= number.integer <= 12',
  from_year: 'number.integer',
  'to_month?': '1 <= number.integer <= 12 | null',
  'to_year?': 'number.integer | null',
  is_primary: 'boolean = false',
}).narrow((data, ctx) => {
  // At least one of job_title or organization must be provided
  const hasJobTitle = data.job_title && data.job_title.trim().length > 0;
  const hasOrganization = data.organization && data.organization.trim().length > 0;

  if (!hasJobTitle && !hasOrganization) {
    ctx.mustBe('a professional history entry with either job_title or organization');
    return false;
  }

  // to_month and to_year must both be NULL or both be set
  const hasToMonth = data.to_month !== null && data.to_month !== undefined;
  const hasToYear = data.to_year !== null && data.to_year !== undefined;

  if (hasToMonth !== hasToYear) {
    ctx.mustBe('a professional history entry with both to_month and to_year set or both null');
    return false;
  }

  // If both dates are set, end date must be >= start date
  if (hasToMonth && hasToYear) {
    const toYear = data.to_year as number;
    const toMonth = data.to_month as number;
    if (toYear < data.from_year || (toYear === data.from_year && toMonth < data.from_month)) {
      ctx.mustBe('a professional history entry with end date after or equal to start date');
      return false;
    }
  }

  return true;
});

export type ProfessionalHistoryInput = typeof ProfessionalHistoryInputSchema.infer;
