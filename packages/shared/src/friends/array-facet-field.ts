import type { FacetFilters } from './facet-filters.js';

/** Fields that are array-type filters (for facet UI components) */
export type ArrayFacetField =
  | 'country'
  | 'city'
  | 'organization'
  | 'job_title'
  | 'department'
  | 'relationship_category'
  | 'circles';

/** Helper to check if a field is an array facet field */
export function isArrayFacetField(field: keyof FacetFilters): field is ArrayFacetField {
  return [
    'country',
    'city',
    'organization',
    'job_title',
    'department',
    'relationship_category',
    'circles',
  ].includes(field);
}
