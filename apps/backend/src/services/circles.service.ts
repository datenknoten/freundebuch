import type {
  CircleInput,
  CircleResponse,
  CircleSummaryResponse,
} from '@freundebuch/shared/index.js';
import type { Pool } from 'pg';
import { CircleNameExistsError } from '../errors/circle-name-exists.error.js';
import { CircleNotFoundError } from '../errors/circle-not-found.error.js';
import { CircularReferenceError } from '../errors/circular-reference.error.js';
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
import { rethrowUniqueViolation } from '../utils/pg-errors.js';

export interface CirclesServiceOptions {
  db: Pool;
}

/**
 * Service for managing circles (categorization/organization feature)
 */
export class CirclesService {
  private db: Pool;

  constructor(options: CirclesServiceOptions) {
    this.db = options.db;
  }

  // ============================================================================
  // Circle CRUD
  // ============================================================================

  /**
   * List all circles for a user
   */
  async listCircles(userExternalId: string): Promise<CircleResponse[]> {
    const results = await getCirclesByUserId.run({ userExternalId }, this.db);
    return results.map((row) => this.mapCircle(row));
  }

  /**
   * Get a single circle by ID
   */
  async getCircleById(
    userExternalId: string,
    circleExternalId: string,
  ): Promise<CircleResponse | null> {
    const results = await getCircleById.run({ userExternalId, circleExternalId }, this.db);
    const [row] = results;
    if (row === undefined) {
      return null;
    }
    return this.mapCircle(row);
  }

  /**
   * Create a new circle
   */
  async createCircle(userExternalId: string, input: CircleInput): Promise<CircleResponse | null> {
    try {
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

      const [created] = results;
      if (created === undefined) {
        return null;
      }

      // Fetch the full circle with friend count
      return this.getCircleById(userExternalId, created.external_id);
    } catch (error) {
      rethrowUniqueViolation(error, {
        idx_circles_unique_name: () => new CircleNameExistsError(),
      });
    }
  }

  /**
   * Update an existing circle
   */
  async updateCircle(
    userExternalId: string,
    circleExternalId: string,
    input: Partial<CircleInput>,
  ): Promise<CircleResponse | null> {
    // Check if parent_circle_id was explicitly provided (even if null to remove parent)
    const updateParent = 'parent_circle_id' in input;

    // Validate parent circle exists if provided and not null
    if (updateParent && input.parent_circle_id !== null && input.parent_circle_id !== undefined) {
      const parent = await this.getCircleById(userExternalId, input.parent_circle_id);
      if (!parent) {
        throw new CircleNotFoundError(input.parent_circle_id);
      }

      // Check for circular reference: walk up the parent chain
      // If we find ourselves, it's a cycle
      await this.checkForCircularReference(
        userExternalId,
        circleExternalId,
        input.parent_circle_id,
      );
    }

    // Use sentinel value '__KEEP__' when parent_circle_id wasn't provided in input
    // NULL means explicitly remove the parent, actual ID means set new parent
    const parentValue = updateParent ? (input.parent_circle_id ?? null) : '__KEEP__';

    try {
      const results = await updateCircle.run(
        {
          userExternalId,
          circleExternalId,
          name: input.name ?? null,
          color: input.color ?? null,
          parentCircleExternalId: parentValue,
          sortOrder: input.sort_order ?? null,
        },
        this.db,
      );

      const [updated] = results;
      if (updated === undefined) {
        return null;
      }

      // Fetch the full circle with friend count
      return this.getCircleById(userExternalId, updated.external_id);
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
   * Uses transaction to ensure atomicity
   */
  async mergeCircles(
    userExternalId: string,
    targetCircleExternalId: string,
    sourceCircleExternalId: string,
  ): Promise<CircleResponse | null> {
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

      // Return the updated target circle (can use pool since transaction is committed)
      return this.getCircleById(userExternalId, targetCircleExternalId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
  ): Promise<CircleSummaryResponse[]> {
    const results = await getCirclesByFriendId.run({ userExternalId, friendExternalId }, this.db);
    return results.map((row) => this.mapCircleSummary(row));
  }

  /**
   * Set circles for a friend (replaces all existing assignments)
   * Uses transaction to ensure atomicity
   */
  async setFriendCircles(
    userExternalId: string,
    friendExternalId: string,
    circleIds: string[],
  ): Promise<CircleSummaryResponse[]> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Clear existing assignments
      await clearFriendCircles.run({ userExternalId, friendExternalId }, client);

      // Add new assignments if any, returns the inserted circles directly
      let results: CircleSummaryResponse[] = [];
      if (circleIds.length > 0) {
        const inserted = await setFriendCircles.run(
          {
            userExternalId,
            friendExternalId,
            circleExternalIds: circleIds,
          },
          client,
        );
        // Map returned data to CircleSummary (filter out nulls from ON CONFLICT DO NOTHING)
        results = inserted.flatMap((row) =>
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
      }

      await client.query('COMMIT');

      return results;
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
  async addFriendToCircle(
    userExternalId: string,
    friendExternalId: string,
    circleExternalId: string,
  ): Promise<CircleSummaryResponse | null> {
    const results = await addFriendToCircle.run(
      { userExternalId, friendExternalId, circleExternalId },
      this.db,
    );

    const [added] = results;
    if (added === undefined) {
      // Either already exists (conflict) or invalid IDs
      // Check if the friend is already in this circle
      const existing = await this.getCirclesForFriend(userExternalId, friendExternalId);
      const found = existing.find((c) => c.id === circleExternalId);
      return found ?? null;
    }

    return this.mapAddResult(added);
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

  private mapAddResult(row: IAddFriendToCircleResult): CircleSummaryResponse | null {
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
