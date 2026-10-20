import { type } from 'arktype';
import { CollectiveMemberContactResponseSchema } from './collective-member-contact-response.js';
import { CollectiveTypeSummaryResponseSchema } from './collective-type-summary-response.js';

export const CollectiveListItemResponseSchema = type({
  id: 'string',
  name: 'string',
  type: CollectiveTypeSummaryResponseSchema,
  photoUrl: 'string | null',
  photoThumbnailUrl: 'string | null',
  memberCount: 'number',
  activeMemberCount: 'number',
  /** The first few members, for a preview */
  memberPreview: CollectiveMemberContactResponseSchema.array(),
  createdAt: 'string',
  deletedAt: 'string | null',
});

export type CollectiveListItemResponse = typeof CollectiveListItemResponseSchema.infer;
