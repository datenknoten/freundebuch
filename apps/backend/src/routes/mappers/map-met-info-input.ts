import type { MetInfoInput } from '@freundebuch/shared/index.js';
import type { MetInfoData } from '../../services/friends/sub-resources/met-info.service.js';

export function mapMetInfoInput(input: MetInfoInput) {
  return {
    metDate: input.met_date,
    metLocation: input.met_location,
    metContext: input.met_context,
  } satisfies MetInfoData;
}
