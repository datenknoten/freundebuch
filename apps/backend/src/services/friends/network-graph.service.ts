import type {
  NetworkGraphData,
  NetworkGraphLink,
  NetworkGraphNode,
  RelationshipCategory,
  RelationshipTypeId,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  getNetworkGraphLinks,
  getNetworkGraphNodes,
} from '../../models/queries/friend-relationships.queries.js';

export interface NetworkGraphServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * NetworkGraphService handles network graph data for visualization.
 * Extracted from FriendsService for better separation of concerns.
 */
export class NetworkGraphService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(options: NetworkGraphServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Get network graph data for visualization
   * Returns all non-archived friends as nodes and their relationships as links
   */
  async getNetworkGraphData(userExternalId: string): Promise<NetworkGraphData> {
    this.logger.debug({ userExternalId }, 'Fetching network graph data');

    // Fetch nodes and links in parallel using PgTyped queries
    const [nodesResult, linksResult] = await Promise.all([
      getNetworkGraphNodes.run({ userExternalId }, this.db),
      getNetworkGraphLinks.run({ userExternalId }, this.db),
    ]);

    const nodes: NetworkGraphNode[] = nodesResult.map((row) => ({
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      isFavorite: row.is_favorite,
    }));

    // Create a set of valid node IDs for filtering links
    const nodeIds = new Set(nodes.map((n) => n.id));

    const links: NetworkGraphLink[] = linksResult
      .filter((row) => nodeIds.has(row.source_id) && nodeIds.has(row.target_id))
      .map((row) => ({
        source: row.source_id,
        target: row.target_id,
        relationshipType: row.relationship_type_id as RelationshipTypeId,
        relationshipCategory: row.relationship_category as RelationshipCategory,
        relationshipLabel: row.relationship_label,
      }));

    this.logger.debug(
      { nodeCount: nodes.length, linkCount: links.length },
      'Network graph data fetched',
    );

    return { nodes, links };
  }
}
