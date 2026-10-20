import { type } from 'arktype';
import type { FacetFilters } from './facet-filters.js';

/** Facet fields whose filter is a list of values */
export const ARRAY_FACET_FIELDS = [
  'country',
  'city',
  'organization',
  'job_title',
  'department',
  'relationship_category',
  'circles',
] as const;

export const ArrayFacetFieldSchema = type.enumerated(...ARRAY_FACET_FIELDS);

export type ArrayFacetField = (typeof ARRAY_FACET_FIELDS)[number];

export function isArrayFacetField(field: keyof FacetFilters): field is ArrayFacetField {
  return ARRAY_FACET_FIELDS.some((arrayField) => arrayField === field);
}
