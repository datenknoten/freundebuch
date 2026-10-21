import type { ArchivedFilter } from './archived-filter.js';
import type { RelationshipCategory } from './relationship-category.js';

export interface FacetFilters {
  country?: string[];
  city?: string[];
  organization?: string[];
  job_title?: string[];
  department?: string[];
  relationship_category?: RelationshipCategory[];
  // Circle external_ids.
  circles?: string[];
  favorites?: boolean;
  archived?: ArchivedFilter;
}
