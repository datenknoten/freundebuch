import { type } from 'arktype';

export const ProfessionalHistoryResponseSchema = type({
  id: 'string',
  'jobTitle?': 'string',
  'organization?': 'string',
  'department?': 'string',
  'notes?': 'string',
  fromMonth: 'number',
  fromYear: 'number',
  /** Null together with `toYear` for the current position */
  toMonth: 'number | null',
  toYear: 'number | null',
  isPrimary: 'boolean',
  createdAt: 'string',
});

export type ProfessionalHistoryResponse = typeof ProfessionalHistoryResponseSchema.infer;
