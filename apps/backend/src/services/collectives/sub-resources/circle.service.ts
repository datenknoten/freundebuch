import { ValidationError } from '@datenknoten/kit';
import type { CircleSummaryResponse, CollectiveCircleResponse } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import { ResourceNotFoundError } from '../../../errors/resource-not-found.error.js';
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
   * Add collective to a circle. Fails when the collective or the circle is not
   * the user's, or the collective already is in the circle.
   */
  public async addToCircle(
    userExternalId: string,
    collectiveExternalId: string,
    circleExternalId: string,
  ) {
    this.logger.debug({ collectiveExternalId, circleExternalId }, 'Adding collective to circle');

    const added = await addToCircle.run(
      { userExternalId, collectiveExternalId, circleExternalId },
      this.db,
    );
    if (added.length === 0) {
      throw new ValidationError('Failed to add collective to circle');
    }
  }

  /**
   * Remove collective from a circle
   */
  public async removeFromCircle(
    userExternalId: string,
    collectiveExternalId: string,
    circleExternalId: string,
  ) {
    this.logger.debug(
      { collectiveExternalId, circleExternalId },
      'Removing collective from circle',
    );

    const removed = await removeFromCircle.run(
      { userExternalId, collectiveExternalId, circleExternalId },
      this.db,
    );
    if (removed.length === 0) {
      throw new ResourceNotFoundError('Circle membership', circleExternalId);
    }
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
