import { type } from 'arktype';
import { CollectiveAddressResponseSchema } from './collective-address-response.js';
import { CollectiveMemberResponseSchema } from './collective-member-response.js';
import { CollectiveTypeResponseSchema } from './collective-type-response.js';

export const CollectiveResponseSchema = type({
  id: 'string',
  name: 'string',
  type: CollectiveTypeResponseSchema,
  photoUrl: 'string | null',
  photoThumbnailUrl: 'string | null',
  notes: 'string | null',
  address: CollectiveAddressResponseSchema,
  memberCount: 'number',
  activeMemberCount: 'number',
  members: CollectiveMemberResponseSchema.array(),
  createdAt: 'string',
  updatedAt: 'string',
  deletedAt: 'string | null',
});

export type CollectiveResponse = typeof CollectiveResponseSchema.infer;
