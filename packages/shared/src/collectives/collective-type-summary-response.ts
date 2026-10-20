import { type } from 'arktype';

export const CollectiveTypeSummaryResponseSchema = type({
  id: 'string',
  name: 'string',
});

export type CollectiveTypeSummaryResponse = typeof CollectiveTypeSummaryResponseSchema.infer;
