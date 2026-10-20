import { type } from 'arktype';

export const RelationshipTypeSummaryResponseSchema = type({
  id: 'string',
  label: 'string',
  category: 'string',
});

export type RelationshipTypeSummaryResponse = typeof RelationshipTypeSummaryResponseSchema.infer;
