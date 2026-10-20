import { type RelationshipTypeId, RelationshipTypeIdSchema } from '@freundebuch/shared/index.js';
import { makeEnumParser } from './make-enum-parser.js';

export const parseRelationshipTypeId = makeEnumParser<RelationshipTypeId>(
  RelationshipTypeIdSchema,
  'RelationshipTypeId',
);
