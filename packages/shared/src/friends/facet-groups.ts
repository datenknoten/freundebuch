import type { CircleFacetValue } from './circle-facet-value.js';
import type { FacetGroup } from './facet-group.js';

/** Facets organized by category */
export interface FacetGroups {
  location: FacetGroup[];
  professional: FacetGroup[];
  relationship: FacetGroup[];
  circles: CircleFacetValue[];
}
