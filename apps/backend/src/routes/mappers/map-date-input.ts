import type { DateInput } from '@freundebuch/shared/index.js';
import type { DateData } from '../../services/friends/sub-resources/date.service.js';

export function mapDateInput(input: DateInput) {
  return {
    dateValue: input.date_value,
    yearKnown: input.year_known,
    dateType: input.date_type,
    label: input.label,
  } satisfies DateData;
}
