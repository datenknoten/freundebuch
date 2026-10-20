import { type Traversal, type } from 'arktype';

const ProfessionalHistoryFieldsSchema = type({
  'job_title?': 'string | null',
  'organization?': 'string | null',
  'department?': 'string | null',
  'notes?': 'string | null',
  from_month: '1 <= number.integer <= 12',
  from_year: 'number.integer',
  'to_month?': '1 <= number.integer <= 12 | null',
  'to_year?': 'number.integer | null',
  is_primary: 'boolean = false',
});

function hasText(value: string | null | undefined) {
  return value !== null && value !== undefined && value.trim().length > 0;
}

function checkProfessionalHistory(
  data: typeof ProfessionalHistoryFieldsSchema.infer,
  ctx: Traversal,
) {
  if (hasText(data.job_title) === false && hasText(data.organization) === false) {
    return ctx.mustBe('a professional history entry with either job_title or organization');
  }

  const toMonth = data.to_month ?? undefined;
  const toYear = data.to_year ?? undefined;

  if (toMonth === undefined && toYear === undefined) {
    return true;
  }
  if (toMonth === undefined || toYear === undefined) {
    return ctx.mustBe(
      'a professional history entry with both to_month and to_year set or both null',
    );
  }
  if (toYear < data.from_year || (toYear === data.from_year && toMonth < data.from_month)) {
    return ctx.mustBe('a professional history entry with end date after or equal to start date');
  }
  return true;
}

export const ProfessionalHistoryInputSchema =
  ProfessionalHistoryFieldsSchema.narrow(checkProfessionalHistory);

export type ProfessionalHistoryInput = typeof ProfessionalHistoryInputSchema.infer;
