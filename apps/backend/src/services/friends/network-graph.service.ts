import type {
  NetworkGraphLinkResponse,
  NetworkGraphNodeResponse,
  NetworkGraphResponse,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  getNetworkGraphLinks,
  getNetworkGraphNodes,
} from '../../models/queries/friend-relationships.queries.js';
import { parseRelationshipCategory } from '../../utils/parse-relationship-category.js';
import { parseRelationshipTypeId } from '../../utils/parse-relationship-type-id.js';

export interface NetworkGraphServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

export class NetworkGraphService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;

  constructor(options: NetworkGraphServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /** Nodes are the non-archived friends; links are their relationships. */
  public async getNetworkGraphData(userExternalId: string) {
    this.logger.debug({ userExternalId }, 'Fetching network graph data');

    const [nodesResult, linksResult] = await Promise.all([
      getNetworkGraphNodes.run({ userExternalId }, this.db),
      getNetworkGraphLinks.run({ userExternalId }, this.db),
    ]);

    const nodes: NetworkGraphNodeResponse[] = nodesResult.map((row) => ({
      id: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url ?? undefined,
      isFavorite: row.is_favorite,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));

    const links: NetworkGraphLinkResponse[] = linksResult
      .filter((row) => nodeIds.has(row.source_id) === true && nodeIds.has(row.target_id) === true)
      .map((row) => ({
        source: row.source_id,
        target: row.target_id,
        relationshipType: parseRelationshipTypeId(row.relationship_type_id),
        relationshipCategory: parseRelationshipCategory(row.relationship_category),
        relationshipLabel: row.relationship_label,
      }));

    this.logger.debug(
      { nodeCount: nodes.length, linkCount: links.length },
      'Network graph data fetched',
    );

    return { nodes, links } satisfies NetworkGraphResponse;
  }
}
