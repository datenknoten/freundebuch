import {
  type RelationshipCategory,
  RelationshipCategorySchema,
} from '@freundebuch/shared/index.js';
import { makeEnumParser } from './make-enum-parser.js';

export const parseRelationshipCategory = makeEnumParser<RelationshipCategory>(
  RelationshipCategorySchema,
  'RelationshipCategory',
);
