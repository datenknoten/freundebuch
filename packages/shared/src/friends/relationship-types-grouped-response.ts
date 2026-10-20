import { type } from 'arktype';
import { RelationshipTypeResponseSchema } from './relationship-type-response.js';

export const RelationshipTypesGroupedResponseSchema = type({
  family: RelationshipTypeResponseSchema.array(),
  professional: RelationshipTypeResponseSchema.array(),
  social: RelationshipTypeResponseSchema.array(),
});

export type RelationshipTypesGroupedResponse = typeof RelationshipTypesGroupedResponseSchema.infer;
