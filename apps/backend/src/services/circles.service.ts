import type { Circle, CircleInput, CircleSummary } from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
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
  type IAddFriendToCircleResult,
  type IGetCirclesByFriendIdResult,
  removeFriendFromCircle,
  setFriendCircles,
} from '../models/queries/friend-circles.queries.js';
import { CircleNotFoundError, CircularReferenceError } from '../utils/errors.js';

/**
 * Service for managing circles (categorization/organization feature)
 */
export class CirclesService {
  constructor(private db: Pool) {}

  // ============================================================================
  // Circle CRUD
  // ============================================================================

  /**
   * List all circles for a user
   */
  async listCircles(userExternalId: string): Promise<Circle[]> {
    const results = await getCirclesByUserId.run({ userExternalId }, this.db);
    return results.map((row) => this.mapCircle(row));
  }

  /**
   * Get a single circle by ID
   */
  async getCircleById(userExternalId: string, circleExternalId: string): Promise<Circle | null> {
    const results = await getCircleById.run({ userExternalId, circleExternalId }, this.db);
    if (results.length === 0) {
      return null;
    }
    return this.mapCircle(results[0]);
  }

  /**
   * Create a new circle
   */
  async createCircle(userExternalId: string, input: CircleInput): Promise<Circle | null> {
    const results = await createCircle.run(
      {
        userExternalId,
        name: input.name,
        color: input.color ?? null,
        parentCircleExternalId: input.parent_circle_id ?? null,
        sortOrder: input.sort_order ?? 0,
      },
      this.db,
    );

    if (results.length === 0) {
      return null;
    }

    // Fetch the full circle with friend count
    return this.getCircleById(userExternalId, results[0].external_id);
  }

  /**
   * Update an existing circle
   */
  async updateCircle(
    userExternalId: string,
    circleExternalId: string,
    input: Partial<CircleInput>,
  ): Promise<Circle | null> {
    // Validate parent circle exists if provided
    if (input.parent_circle_id !== undefined && input.parent_circle_id !== null) {
      const parent = await this.getCircleById(userExternalId, input.parent_circle_id);
      if (!parent) {
        throw new CircleNotFoundError(`Parent circle ${input.parent_circle_id} not found`);
      }

      // Check for circular reference: walk up the parent chain
      // If we find ourselves, it's a cycle
      await this.checkForCircularReference(
        userExternalId,
        circleExternalId,
        input.parent_circle_id,
      );
    }

    const results = await updateCircle.run(
      {
        userExternalId,
        circleExternalId,
        name: input.name ?? null,
        color: input.color ?? null,
        parentCircleExternalId: input.parent_circle_id ?? null,
        sortOrder: input.sort_order ?? null,
      },
      this.db,
    );

    if (results.length === 0) {
      return null;
    }

    // Fetch the full circle with friend count
    return this.getCircleById(userExternalId, results[0].external_id);
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
      const current = await this.getCircleById(userExternalId, currentId);
      currentId = current?.parentCircleId ?? null;
    }
  }

  /**
   * Delete a circle (friends remain, just unassigned from this circle)
   */
  async deleteCircle(userExternalId: string, circleExternalId: string): Promise<boolean> {
    const results = await deleteCircle.run({ userExternalId, circleExternalId }, this.db);
    return results.length > 0;
  }

  /**
   * Reorder circles by updating their sort_order (uses transaction for consistency)
   */
  async reorderCircles(
    userExternalId: string,
    order: { id: string; sort_order: number }[],
  ): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      for (const item of order) {
        await updateCircleSortOrder.run(
          {
            userExternalId,
            circleExternalId: item.id,
            sortOrder: item.sort_order,
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
   */
  async mergeCircles(
    userExternalId: string,
    targetCircleExternalId: string,
    sourceCircleExternalId: string,
  ): Promise<Circle | null> {
    // Move all friends from source to target
    await mergeCircles.run(
      {
        userExternalId,
        targetCircleExternalId,
        sourceCircleExternalId,
      },
      this.db,
    );

    // Delete the source circle
    await deleteCircle.run({ userExternalId, circleExternalId: sourceCircleExternalId }, this.db);

    // Return the updated target circle
    return this.getCircleById(userExternalId, targetCircleExternalId);
  }

  // ============================================================================
  // Friend-Circle Assignment
  // ============================================================================

  /**
   * Get all circles for a specific friend
   */
  async getCirclesForFriend(
    userExternalId: string,
    friendExternalId: string,
  ): Promise<CircleSummary[]> {
    const results = await getCirclesByFriendId.run({ userExternalId, friendExternalId }, this.db);
    return results.map((row) => this.mapCircleSummary(row));
  }

  /**
   * Set circles for a friend (replaces all existing assignments)
   */
  async setFriendCircles(
    userExternalId: string,
    friendExternalId: string,
    circleIds: string[],
  ): Promise<CircleSummary[]> {
    // Clear existing assignments
    await clearFriendCircles.run({ userExternalId, friendExternalId }, this.db);

    // Add new assignments if any
    if (circleIds.length > 0) {
      await setFriendCircles.run(
        {
          userExternalId,
          friendExternalId,
          circleExternalIds: circleIds,
        },
        this.db,
      );
    }

    // Return the updated circles
    return this.getCirclesForFriend(userExternalId, friendExternalId);
  }

  /**
   * Add a friend to a single circle
   */
  async addFriendToCircle(
    userExternalId: string,
    friendExternalId: string,
    circleExternalId: string,
  ): Promise<CircleSummary | null> {
    const results = await addFriendToCircle.run(
      { userExternalId, friendExternalId, circleExternalId },
      this.db,
    );

    if (results.length === 0) {
      // Either already exists (conflict) or invalid IDs
      // Check if the friend is already in this circle
      const existing = await this.getCirclesForFriend(userExternalId, friendExternalId);
      const found = existing.find((c) => c.id === circleExternalId);
      return found ?? null;
    }

    return this.mapAddResult(results[0]);
  }

  /**
   * Remove a friend from a circle
   */
  async removeFriendFromCircle(
    userExternalId: string,
    friendExternalId: string,
    circleExternalId: string,
  ): Promise<boolean> {
    const results = await removeFriendFromCircle.run(
      { userExternalId, friendExternalId, circleExternalId },
      this.db,
    );
    return results.length > 0;
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapCircle(row: IGetCirclesByUserIdResult | IGetCircleByIdResult): Circle {
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

  private mapCircleSummary(row: IGetCirclesByFriendIdResult): CircleSummary {
    return {
      id: row.external_id,
      name: row.name,
      color: row.color,
    };
  }

  private mapAddResult(row: IAddFriendToCircleResult): CircleSummary | null {
    if (!row.circle_external_id || !row.circle_name) {
      return null;
    }
    return {
      id: row.circle_external_id,
      name: row.circle_name,
      color: row.circle_color,
    };
  }
}
