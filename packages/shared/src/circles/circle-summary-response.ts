import { type } from 'arktype';

/** Circle embedded in friend responses */
export const CircleSummaryResponseSchema = type({
  id: 'string',
  name: 'string',
  color: 'string | null',
});

export type CircleSummaryResponse = typeof CircleSummaryResponseSchema.infer;
