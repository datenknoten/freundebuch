import type pg from 'pg';
import type { Logger } from 'pino';
import {
  addToCircle,
  getAvailableCircles,
  getCirclesByCollectiveId,
  type IGetCirclesByCollectiveIdResult,
  removeFromCircle,
} from '../../../models/queries/collective-circles.queries.js';

export interface CollectiveCircle {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface AvailableCircle {
  id: string;
  name: string;
  color: string | null;
}

export interface CollectiveCircleServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * CircleService handles circle membership for collectives.
 */
export class CollectiveCircleService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(options: CollectiveCircleServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Get all circles a collective belongs to
   */
  async getCircles(
    userExternalId: string,
    collectiveExternalId: string,
  ): Promise<CollectiveCircle[]> {
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
  async getAvailableCircles(
    userExternalId: string,
    collectiveExternalId: string,
  ): Promise<AvailableCircle[]> {
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
  async addToCircle(
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
  async removeFromCircle(
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

  private mapCircle(row: IGetCirclesByCollectiveIdResult): CollectiveCircle {
    return {
      id: row.circle_external_id,
      name: row.circle_name,
      color: row.circle_color,
      createdAt: row.created_at.toISOString(),
    };
  }
}
