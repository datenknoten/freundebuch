import type { ProfessionalHistoryInput } from '@freundebuch/shared/index.js';
import type { ProfessionalHistoryData } from '../../services/friends/sub-resources/professional-history.service.js';

export function mapProfessionalHistoryInput(input: ProfessionalHistoryInput) {
  return {
    jobTitle: input.job_title,
    organization: input.organization,
    department: input.department,
    notes: input.notes,
    fromMonth: input.from_month,
    fromYear: input.from_year,
    toMonth: input.to_month,
    toYear: input.to_year,
    isPrimary: input.is_primary,
  } satisfies ProfessionalHistoryData;
}
