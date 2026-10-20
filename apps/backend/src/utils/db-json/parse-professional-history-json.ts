import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const ProfessionalHistoryJsonRowSchema = type({
  external_id: 'string',
  job_title: 'string | null',
  organization: 'string | null',
  department: 'string | null',
  notes: 'string | null',
  from_month: 'number',
  from_year: 'number',
  to_month: 'number | null',
  to_year: 'number | null',
  is_primary: 'boolean',
  created_at: 'string',
});

export type ProfessionalHistoryJsonRow = typeof ProfessionalHistoryJsonRowSchema.infer;

export function parseProfessionalHistoryJson(
  value: unknown,
  logger: Logger,
): ProfessionalHistoryJsonRow[] {
  return safeArray(value, ProfessionalHistoryJsonRowSchema, logger, 'professionalHistory');
}
