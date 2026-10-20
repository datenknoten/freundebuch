import type { RelationshipCategory } from './relationship-category.js';
import type { RelationshipTypeId } from './relationship-type-id.js';

/**
 * Parse and validate faceted search query parameters
 */
// ============================================================================
// Network Graph Types (Dashboard visualization)
// ============================================================================

/** Node in the relationship network graph */
export interface NetworkGraphNode {
  id: string;
  displayName: string;
  photoThumbnailUrl?: string;
  isFavorite: boolean;
}

/** Link in the relationship network graph */
export interface NetworkGraphLink {
  source: string;
  target: string;
  relationshipType: RelationshipTypeId;
  relationshipCategory: RelationshipCategory;
  relationshipLabel: string;
}

/** Network graph data for visualization */
export interface NetworkGraphData {
  nodes: NetworkGraphNode[];
  links: NetworkGraphLink[];
}
