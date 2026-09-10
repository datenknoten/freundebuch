import type pg from 'pg';
import type { Logger } from 'pino';
import { withTransaction } from '../../utils/db.js';
import { ConflictError } from '../../utils/errors.js';
import { rethrowUniqueViolation } from '../../utils/pg-errors.js';

/**
 * Partial unique indexes that allow exactly one primary row per owner
 * (migration 1779668200000). Every sub-resource write can trip one of them.
 */
const SINGLE_PRIMARY_INDEXES = [
  'idx_friend_phones_single_primary',
  'idx_friend_emails_single_primary',
  'idx_friend_addresses_single_primary',
  'idx_friend_professional_history_single_primary',
  'idx_collective_phones_single_primary',
  'idx_collective_emails_single_primary',
  'idx_collective_addresses_single_primary',
] as const;

/**
 * Signals "the write matched no row" from inside a transaction so that the
 * transaction rolls back. Without it, the primary-flag clear for an unknown
 * owner or resource id gets committed and leaves the owner with zero primary
 * rows while the client still receives a 404.
 */
class NoRowWrittenError extends Error {}

/**
 * Configuration for a sub-resource service.
 *
 * "Owner" is the parent the sub-resource belongs to — a friend or a
 * collective. Concrete services map `ownerExternalId` onto the appropriate
 * query parameter (friendExternalId / collectiveExternalId).
 */
export interface SubResourceConfig<
  TInput,
  TOutput,
  TCreateResult,
  TUpdateResult,
  TDeleteResult,
  TListResult = TCreateResult,
> {
  /** Name of the resource for logging purposes */
  resourceName: string;

  /** Whether this resource supports a primary flag */
  hasPrimaryFlag: boolean;

  /** Function to create a new resource */
  createFn: (
    params: { userExternalId: string; ownerExternalId: string; input: TInput },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TCreateResult[]>;

  /** Function to update an existing resource */
  updateFn: (
    params: {
      userExternalId: string;
      ownerExternalId: string;
      resourceExternalId: string;
      input: TInput;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TUpdateResult[]>;

  /** Function to delete a resource */
  deleteFn: (
    params: { userExternalId: string; ownerExternalId: string; resourceExternalId: string },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TDeleteResult[]>;

  /** Optional function to clear primary flag before setting a new primary */
  clearPrimaryFn?: (
    params: { userExternalId: string; ownerExternalId: string },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<unknown>;

  /** Function to list all resources for an owner */
  listFn: (
    params: { userExternalId: string; ownerExternalId: string },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TListResult[]>;

  /** Function to map a list result to output type */
  mapListResult: (result: TListResult) => TOutput;

  /** Function to check if input has primary flag set */
  isPrimary?: (input: TInput) => boolean;

  /** Function to set the primary flag on an input (for auto-primary) */
  setIsPrimary?: (input: TInput, value: boolean) => TInput;

  /** Function to map database result to output type */
  mapResult: (result: TCreateResult | TUpdateResult) => TOutput;
}

export interface SubResourceServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * Abstract base class for sub-resource services (friend and collective phones,
 * emails, addresses, urls, …). Provides config-driven CRUD, optional listing,
 * and race-safe primary-flag handling: clearing the old primary and writing the
 * new one happen in a single transaction.
 */
export abstract class SubResourceService<
  TInput,
  TOutput,
  TCreateResult,
  TUpdateResult,
  TDeleteResult,
  TListResult = TCreateResult,
> {
  protected db: pg.Pool;
  protected logger: Logger;
  protected config: SubResourceConfig<
    TInput,
    TOutput,
    TCreateResult,
    TUpdateResult,
    TDeleteResult,
    TListResult
  >;

  constructor(
    options: SubResourceServiceOptions,
    config: SubResourceConfig<
      TInput,
      TOutput,
      TCreateResult,
      TUpdateResult,
      TDeleteResult,
      TListResult
    >,
  ) {
    this.db = options.db;
    this.logger = options.logger;
    this.config = config;
  }

  /**
   * List all sub-resources for an owner.
   */
  async list(userExternalId: string, ownerExternalId: string): Promise<TOutput[]> {
    this.logger.debug({ ownerExternalId }, `Listing ${this.config.resourceName}s`);
    const rows = await this.config.listFn({ userExternalId, ownerExternalId }, this.db);
    return rows.map(this.config.mapListResult);
  }

  /**
   * Add a new sub-resource to an owner.
   *
   * Always runs in its own transaction: clearing the previous primary and
   * writing the new row must either both happen or neither.
   */
  async add(
    userExternalId: string,
    ownerExternalId: string,
    input: TInput,
  ): Promise<TOutput | null> {
    this.logger.debug({ ownerExternalId }, `Adding ${this.config.resourceName}`);

    try {
      return await withTransaction(this.db, async (txClient) => {
        const created = await this.addWithin(txClient, userExternalId, ownerExternalId, input);
        if (created === null) {
          throw new NoRowWrittenError();
        }
        return created;
      });
    } catch (error) {
      if (error instanceof NoRowWrittenError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Add a sub-resource on a caller-supplied client. The caller owns the
   * transaction (see `createMany`, used while a friend is being created), so
   * this never begins or rolls back one and reports a missing row as `null`.
   */
  protected async addWithin(
    client: pg.Pool | pg.PoolClient,
    userExternalId: string,
    ownerExternalId: string,
    input: TInput,
  ): Promise<TOutput | null> {
    // Auto-set primary if this is the first entry.
    if (this.config.hasPrimaryFlag && this.config.setIsPrimary !== undefined) {
      const existing = await this.config.listFn({ userExternalId, ownerExternalId }, client);
      if (existing.length === 0) {
        input = this.config.setIsPrimary(input, true);
      }
    }

    if (
      this.config.hasPrimaryFlag &&
      this.config.clearPrimaryFn !== undefined &&
      this.config.isPrimary?.(input) === true
    ) {
      await this.config.clearPrimaryFn({ userExternalId, ownerExternalId }, client);
    }

    const result = await this.write(() =>
      this.config.createFn({ userExternalId, ownerExternalId, input }, client),
    );
    return result === undefined ? null : this.config.mapResult(result);
  }

  /**
   * Update an existing sub-resource.
   *
   * Always runs in its own transaction, and rolls back when the update matched
   * no row so a cleared primary flag is never left behind.
   */
  async update(
    userExternalId: string,
    ownerExternalId: string,
    resourceExternalId: string,
    input: TInput,
  ): Promise<TOutput | null> {
    this.logger.debug(
      { ownerExternalId, resourceExternalId },
      `Updating ${this.config.resourceName}`,
    );

    try {
      return await withTransaction(this.db, async (txClient) => {
        if (
          this.config.hasPrimaryFlag &&
          this.config.clearPrimaryFn !== undefined &&
          this.config.isPrimary?.(input) === true
        ) {
          await this.config.clearPrimaryFn({ userExternalId, ownerExternalId }, txClient);
        }

        const result = await this.write(() =>
          this.config.updateFn(
            { userExternalId, ownerExternalId, resourceExternalId, input },
            txClient,
          ),
        );
        if (result === undefined) {
          throw new NoRowWrittenError();
        }
        return this.config.mapResult(result);
      });
    } catch (error) {
      if (error instanceof NoRowWrittenError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a sub-resource.
   */
  async delete(
    userExternalId: string,
    ownerExternalId: string,
    resourceExternalId: string,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<boolean> {
    this.logger.debug(
      { ownerExternalId, resourceExternalId },
      `Deleting ${this.config.resourceName}`,
    );

    const dbClient = client ?? this.db;
    const result = await this.config.deleteFn(
      { userExternalId, ownerExternalId, resourceExternalId },
      dbClient,
    );
    return result.length > 0;
  }

  /**
   * Run a write and turn a single-primary index violation into a 409.
   *
   * Clearing the previous primary and inserting the new one is atomic, but two
   * transactions can still interleave so that both insert a primary row; the
   * loser hits the partial unique index. That is a conflict the client can
   * retry, not the 500 an unhandled driver error produces.
   */
  private async write<T>(fn: () => Promise<T[]>): Promise<T | undefined> {
    try {
      const [row] = await fn();
      return row;
    } catch (error) {
      rethrowUniqueViolation(
        error,
        Object.fromEntries(
          SINGLE_PRIMARY_INDEXES.map((index) => [
            index,
            () =>
              new ConflictError(
                `Another primary ${this.config.resourceName} was set concurrently; retry`,
              ),
          ]),
        ),
      );
    }
  }

  /**
   * Create multiple sub-resources for an owner on the caller's transaction
   * (friend creation writes the friend row and all sub-resources atomically),
   * so the client is required: without it the rows would land outside that
   * transaction and could not see the uncommitted owner.
   */
  async createMany(
    userExternalId: string,
    ownerExternalId: string,
    inputs: TInput[],
    client: pg.Pool | pg.PoolClient,
  ): Promise<TOutput[]> {
    const results: TOutput[] = [];
    for (const input of inputs) {
      const created = await this.addWithin(client, userExternalId, ownerExternalId, input);
      if (created !== null) {
        results.push(created);
      }
    }
    return results;
  }
}
