import type { RelationshipCategory } from './relationship-category.js';

/** Active facet filter selections */
export interface FacetFilters {
  country?: string[];
  city?: string[];
  organization?: string[];
  job_title?: string[];
  department?: string[];
  relationship_category?: RelationshipCategory[];
  // Epic 4: Categorization & Organization
  circles?: string[]; // Circle external_ids
  favorites?: boolean;
  archived?: 'include' | 'exclude' | 'only'; // 'include' shows all, 'exclude' hides archived (default), 'only' shows only archived
}
