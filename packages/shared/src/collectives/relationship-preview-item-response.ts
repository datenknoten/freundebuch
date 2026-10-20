import { type } from 'arktype';
import { CollectiveMemberContactResponseSchema } from './collective-member-contact-response.js';
import { RelationshipTypeSummaryResponseSchema } from './relationship-type-summary-response.js';

/** A relationship that adding the member would create */
export const RelationshipPreviewItemResponseSchema = type({
  fromContact: CollectiveMemberContactResponseSchema,
  toContact: CollectiveMemberContactResponseSchema,
  relationshipType: RelationshipTypeSummaryResponseSchema,
  alreadyExists: 'boolean',
});

export type RelationshipPreviewItemResponse = typeof RelationshipPreviewItemResponseSchema.infer;
