import type { Paginated } from '../pagination/paginated.js';
import type { FacetGroups } from './facet-groups.js';
import type { GlobalSearchResult } from './global-search-result.js';

/** Paginated search response with optional facet data */
export type FacetedSearchResponse = Paginated<GlobalSearchResult> & {
  facets?: FacetGroups;
};
