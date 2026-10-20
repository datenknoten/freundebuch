import type { CircleResponse, CircleSummaryResponse } from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import { CircleCreationError } from '../errors/circle-creation.error.js';
import { CircleNameExistsError } from '../errors/circle-name-exists.error.js';
import { CircleNotFoundError } from '../errors/circle-not-found.error.js';
import { CircularReferenceError } from '../errors/circular-reference.error.js';
import { ResourceNotFoundError } from '../errors/resource-not-found.error.js';
import {
  createCircle,
  deleteCircle,
  getCircleById,
  getCirclesByUserId,
  type IGetCircleByIdResult,
  type IGetCirclesByUserIdResult,
  mergeCircles,
  updateCircle,
  updateCircleSortOrder,
} from '../models/queries/circles.queries.js';
import {
  addFriendToCircle,
  clearFriendCircles,
  getCirclesByFriendId,
  type IGetCirclesByFriendIdResult,
  type ISetFriendCirclesResult,
  removeFriendFromCircle,
  setFriendCircles,
} from '../models/queries/friend-circles.queries.js';
import { rethrowUniqueViolation } from '../utils/rethrow-unique-violation.js';

export interface CirclesServiceOptions {
  db: Pool;
}

export interface CircleData {
  name: string;
  color?: string | null;
  /** Absent leaves the parent untouched on update; `null` removes it. */
  parentCircleId?: string | null;
  sortOrder?: number;
}

export interface CircleOrderData {
  id: string;
  sortOrder: number;
}

/**
 * Service for managing circles (categorization/organization feature)
 */
export class CirclesService {
  private readonly db: Pool;

  constructor(options: CirclesServiceOptions) {
    this.db = options.db;
  }

  // ============================================================================
  // Circle CRUD
  // ============================================================================

  /**
   * List all circles for a user
   */
  public async listCircles(userExternalId: string): Promise<CircleResponse[]> {
    const results = await getCirclesByUserId.run({ userExternalId }, this.db);
    return results.map((row) => this.mapCircle(row));
  }

  public async findCircle(userExternalId: string, circleExternalId: string) {
    const [row] = await getCircleById.run({ userExternalId, circleExternalId }, this.db);
    if (row === undefined) {
      return undefined;
    }
    return this.mapCircle(row);
  }

  public async getCircle(userExternalId: string, circleExternalId: string) {
    const circle = await this.findCircle(userExternalId, circleExternalId);
    if (circle === undefined) {
      throw new CircleNotFoundError(circleExternalId);
    }
    return circle;
  }

  public async createCircle(userExternalId: string, data: CircleData) {
    try {
      const [created] = await createCircle.run(
        {
          userExternalId,
          name: data.name,
          color: data.color ?? null,
          parentCircleExternalId: data.parentCircleId ?? null,
          sortOrder: data.sortOrder ?? 0,
        },
        this.db,
      );
      if (created === undefined) {
        throw new CircleCreationError();
      }

      // Re-read to include the friend count
      return await this.getCircle(userExternalId, created.external_id);
    } catch (error) {
      rethrowUniqueViolation(error, {
        idx_circles_unique_name: () => new CircleNameExistsError(),
      });
    }
  }

  public async updateCircle(
    userExternalId: string,
    circleExternalId: string,
    data: Partial<CircleData>,
  ) {
    if (data.parentCircleId !== undefined && data.parentCircleId !== null) {
      await this.getCircle(userExternalId, data.parentCircleId);
      await this.checkForCircularReference(userExternalId, circleExternalId, data.parentCircleId);
    }

    // '__KEEP__' leaves the parent untouched; NULL removes it
    const parentValue = data.parentCircleId === undefined ? '__KEEP__' : data.parentCircleId;

    try {
      const [updated] = await updateCircle.run(
        {
          userExternalId,
          circleExternalId,
          name: data.name ?? null,
          color: data.color ?? null,
          parentCircleExternalId: parentValue,
          sortOrder: data.sortOrder ?? null,
        },
        this.db,
      );
      if (updated === undefined) {
        throw new CircleNotFoundError(circleExternalId);
      }

      // Re-read to include the friend count
      return await this.getCircle(userExternalId, updated.external_id);
    } catch (error) {
      rethrowUniqueViolation(error, {
        idx_circles_unique_name: () => new CircleNameExistsError(),
      });
    }
  }

  /**
   * Check if setting a parent would create a circular reference
   */
  private async checkForCircularReference(
    userExternalId: string,
    circleExternalId: string,
    newParentExternalId: string,
  ): Promise<void> {
    // Walk up the ancestor chain from the proposed parent
    let currentId: string | null = newParentExternalId;
    const visited = new Set<string>();

    while (currentId) {
      // If we find ourselves in the ancestor chain, it's a cycle
      if (currentId === circleExternalId) {
        throw new CircularReferenceError(
          'Cannot set parent: would create circular reference in hierarchy',
        );
      }

      // Prevent infinite loops from existing bad data
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      // Get the parent of the current circle
      const current = await this.findCircle(userExternalId, currentId);
      currentId = current?.parentCircleId ?? null;
    }
  }

  /**
   * Delete a circle (friends remain, just unassigned from this circle)
   */
  public async deleteCircle(userExternalId: string, circleExternalId: string) {
    const results = await deleteCircle.run({ userExternalId, circleExternalId }, this.db);
    if (results.length === 0) {
      throw new CircleNotFoundError(circleExternalId);
    }
  }

  /**
   * Reorder circles by updating their sort_order (uses transaction for consistency)
   */
  public async reorderCircles(userExternalId: string, order: CircleOrderData[]) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      for (const item of order) {
        await updateCircleSortOrder.run(
          {
            userExternalId,
            circleExternalId: item.id,
            sortOrder: item.sortOrder,
          },
          client,
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Merge one circle into another (move all friends, then delete source)
   * Uses transaction to ensure atomicity
   */
  public async mergeCircles(
    userExternalId: string,
    targetCircleExternalId: string,
    sourceCircleExternalId: string,
  ) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Move all friends from source to target
      await mergeCircles.run(
        {
          userExternalId,
          targetCircleExternalId,
          sourceCircleExternalId,
        },
        client,
      );

      // Delete the source circle
      const deleteResult = await deleteCircle.run(
        { userExternalId, circleExternalId: sourceCircleExternalId },
        client,
      );
      if (deleteResult.length === 0) {
        throw new CircleNotFoundError(sourceCircleExternalId);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return this.getCircle(userExternalId, targetCircleExternalId);
  }

  // ============================================================================
  // Friend-Circle Assignment
  // ============================================================================

  /**
   * Get all circles for a specific friend
   */
  public async getCirclesForFriend(
    userExternalId: string,
    friendExternalId: string,
  ): Promise<CircleSummaryResponse[]> {
    const results = await getCirclesByFriendId.run({ userExternalId, friendExternalId }, this.db);
    return results.map((row) => this.mapCircleSummary(row));
  }

  /**
   * Set circles for a friend (replaces all existing assignments)
   * Uses transaction to ensure atomicity
   */
  public async setFriendCircles(
    userExternalId: string,
    friendExternalId: string,
    circleIds: string[],
  ): Promise<CircleSummaryResponse[]> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Clear existing assignments
      await clearFriendCircles.run({ userExternalId, friendExternalId }, client);

      const inserted: ISetFriendCirclesResult[] =
        circleIds.length === 0
          ? []
          : await setFriendCircles.run(
              {
                userExternalId,
                friendExternalId,
                circleExternalIds: circleIds,
              },
              client,
            );

      await client.query('COMMIT');

      // ON CONFLICT DO NOTHING rows come back with null circle columns
      return inserted.flatMap((row) =>
        row.circle_external_id !== null && row.circle_name !== null
          ? [
              {
                id: row.circle_external_id,
                name: row.circle_name,
                color: row.circle_color,
              },
            ]
          : [],
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add a friend to a single circle
   */
  public async addFriendToCircle(
    userExternalId: string,
    friendExternalId: string,
    circleExternalId: string,
  ) {
    const [added] = await addFriendToCircle.run(
      { userExternalId, friendExternalId, circleExternalId },
      this.db,
    );

    if (added === undefined) {
      // Either already assigned (conflict) or invalid IDs
      const existing = await this.getCirclesForFriend(userExternalId, friendExternalId);
      const found = existing.find((c) => c.id === circleExternalId);
      if (found === undefined) {
        throw new ResourceNotFoundError(
          'Friend or circle',
          `${friendExternalId}/${circleExternalId}`,
        );
      }
      return found;
    }

    if (added.circle_external_id === null || added.circle_name === null) {
      throw new ResourceNotFoundError(
        'Friend or circle',
        `${friendExternalId}/${circleExternalId}`,
      );
    }
    return {
      id: added.circle_external_id,
      name: added.circle_name,
      color: added.circle_color,
    };
  }

  /**
   * Remove a friend from a circle
   */
  public async removeFriendFromCircle(
    userExternalId: string,
    friendExternalId: string,
    circleExternalId: string,
  ) {
    const results = await removeFriendFromCircle.run(
      { userExternalId, friendExternalId, circleExternalId },
      this.db,
    );
    if (results.length === 0) {
      throw new ResourceNotFoundError(
        'Friend-circle assignment',
        `${friendExternalId}/${circleExternalId}`,
      );
    }
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapCircle(row: IGetCirclesByUserIdResult | IGetCircleByIdResult): CircleResponse {
    return {
      id: row.external_id,
      name: row.name,
      color: row.color,
      parentCircleId: row.parent_circle_external_id ?? null,
      sortOrder: row.sort_order,
      friendCount: row.friend_count ?? 0,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapCircleSummary(row: IGetCirclesByFriendIdResult): CircleSummaryResponse {
    return {
      id: row.external_id,
      name: row.name,
      color: row.color,
    };
  }
}
