import type { CircleSummaryResponse, CollectiveCircleResponse } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  addToCircle,
  getAvailableCircles,
  getCirclesByCollectiveId,
  type IGetCirclesByCollectiveIdResult,
  removeFromCircle,
} from '../../../models/queries/collective-circles.queries.js';

export interface CollectiveCircleServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * CircleService handles circle membership for collectives.
 */
export class CollectiveCircleService {
  private readonly db: pg.Pool;
  private readonly logger: Logger;

  constructor(options: CollectiveCircleServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Get all circles a collective belongs to
   */
  public async getCircles(
    userExternalId: string,
    collectiveExternalId: string,
  ): Promise<CollectiveCircleResponse[]> {
    this.logger.debug({ collectiveExternalId }, 'Getting circles for collective');

    const rows = await getCirclesByCollectiveId.run(
      { userExternalId, collectiveExternalId },
      this.db,
    );

    return rows.map(this.mapCircle);
  }

  /**
   * Get available circles (not already assigned to collective)
   */
  public async getAvailableCircles(
    userExternalId: string,
    collectiveExternalId: string,
  ): Promise<CircleSummaryResponse[]> {
    this.logger.debug({ collectiveExternalId }, 'Getting available circles for collective');

    const rows = await getAvailableCircles.run({ userExternalId, collectiveExternalId }, this.db);

    return rows.map((row) => ({
      id: row.external_id,
      name: row.name,
      color: row.color,
    }));
  }

  /**
   * Add collective to a circle
   */
  public async addToCircle(
    userExternalId: string,
    collectiveExternalId: string,
    circleExternalId: string,
  ): Promise<boolean> {
    this.logger.debug({ collectiveExternalId, circleExternalId }, 'Adding collective to circle');

    const result = await addToCircle.run(
      { userExternalId, collectiveExternalId, circleExternalId },
      this.db,
    );

    return result.length > 0;
  }

  /**
   * Remove collective from a circle
   */
  public async removeFromCircle(
    userExternalId: string,
    collectiveExternalId: string,
    circleExternalId: string,
  ): Promise<boolean> {
    this.logger.debug(
      { collectiveExternalId, circleExternalId },
      'Removing collective from circle',
    );

    const result = await removeFromCircle.run(
      { userExternalId, collectiveExternalId, circleExternalId },
      this.db,
    );

    return result.length > 0;
  }

  private mapCircle(row: IGetCirclesByCollectiveIdResult): CollectiveCircleResponse {
    return {
      id: row.circle_external_id,
      name: row.circle_name,
      color: row.circle_color,
      createdAt: row.created_at.toISOString(),
    };
  }
}
