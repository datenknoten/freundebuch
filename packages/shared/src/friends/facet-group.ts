import type { ArrayFacetField } from './array-facet-field.js';
import type { FacetValue } from './facet-value.js';

/** Collection of facet values for a specific field (array-type facets only) */
export interface FacetGroup {
  field: ArrayFacetField;
  label: string;
  values: FacetValue[];
}
