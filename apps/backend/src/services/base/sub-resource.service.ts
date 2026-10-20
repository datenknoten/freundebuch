import { type AppError, ConflictError } from '@datenknoten/kit';
import type pg from 'pg';
import type { Logger } from 'pino';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error.js';
import { rethrowUniqueViolation } from '../../utils/rethrow-unique-violation.js';
import { withTransaction } from '../../utils/with-transaction.js';

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
 * Configuration for a sub-resource service.
 *
 * "Owner" is the parent the sub-resource belongs to — a friend or a
 * collective. Concrete services map `ownerExternalId` onto the appropriate
 * query parameter (friendExternalId / collectiveExternalId).
 */
export interface SubResourceConfig<
  TData,
  TOutput,
  TCreateResult,
  TUpdateResult,
  TDeleteResult,
  TListResult = TCreateResult,
> {
  /** Name of the resource for logging purposes */
  resourceName: string;

  /** Resource name in the "<label> not found: <id>" error of `update` and `delete`. */
  resourceLabel: string;

  /** Raised with the owner id when `add` finds no owner of the user. */
  ownerNotFound: new (
    ownerId: string,
  ) => AppError;

  /** Whether this resource supports a primary flag */
  hasPrimaryFlag: boolean;

  /** Function to create a new resource */
  createFn: (
    params: { userExternalId: string; ownerExternalId: string; data: TData },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TCreateResult[]>;

  /** Function to update an existing resource */
  updateFn: (
    params: {
      userExternalId: string;
      ownerExternalId: string;
      resourceExternalId: string;
      data: TData;
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

  /** Function to check if the data has the primary flag set */
  isPrimary?: (data: TData) => boolean;

  /** Function to set the primary flag on the data (for auto-primary) */
  setIsPrimary?: (data: TData, isPrimary: boolean) => TData;

  /** Function to map database result to output type */
  mapResult: (result: TCreateResult | TUpdateResult) => TOutput;
}

export interface SubResourceServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

export interface SubResourceServiceBaseOptions<
  TData,
  TOutput,
  TCreateResult,
  TUpdateResult,
  TDeleteResult,
  TListResult = TCreateResult,
> extends SubResourceServiceOptions {
  definition: SubResourceConfig<
    TData,
    TOutput,
    TCreateResult,
    TUpdateResult,
    TDeleteResult,
    TListResult
  >;
}

/**
 * Abstract base class for sub-resource services (friend and collective phones,
 * emails, addresses, urls, …). Provides config-driven CRUD, optional listing,
 * and race-safe primary-flag handling: clearing the old primary and writing the
 * new one happen in a single transaction.
 */
export abstract class SubResourceService<
  TData,
  TOutput,
  TCreateResult,
  TUpdateResult,
  TDeleteResult,
  TListResult = TCreateResult,
> {
  protected readonly db: pg.Pool;
  protected readonly logger: Logger;
  protected readonly config: SubResourceConfig<
    TData,
    TOutput,
    TCreateResult,
    TUpdateResult,
    TDeleteResult,
    TListResult
  >;

  constructor(
    options: SubResourceServiceBaseOptions<
      TData,
      TOutput,
      TCreateResult,
      TUpdateResult,
      TDeleteResult,
      TListResult
    >,
  ) {
    this.db = options.db;
    this.logger = options.logger;
    this.config = options.definition;
  }

  /**
   * List all sub-resources for an owner.
   */
  public async list(userExternalId: string, ownerExternalId: string): Promise<TOutput[]> {
    this.logger.debug(
      { ownerExternalId, resource: this.config.resourceName },
      'Listing sub-resources',
    );
    const rows = await this.config.listFn({ userExternalId, ownerExternalId }, this.db);
    return rows.map(this.config.mapListResult);
  }

  /**
   * Add a new sub-resource to an owner.
   *
   * Always runs in its own transaction: clearing the previous primary and
   * writing the new row must either both happen or neither.
   */
  public async add(userExternalId: string, ownerExternalId: string, data: TData) {
    this.logger.debug(
      { ownerExternalId, resource: this.config.resourceName },
      'Adding sub-resource',
    );

    return withTransaction(this.db, async (txClient) => {
      const created = await this.addWithin(txClient, userExternalId, ownerExternalId, data);
      if (created === undefined) {
        throw new this.config.ownerNotFound(ownerExternalId);
      }
      return created;
    });
  }

  /**
   * Add a sub-resource on a caller-supplied client. The caller owns the
   * transaction (see `createMany`, used while a friend is being created), so
   * this never begins or rolls back one and reports a missing owner as `undefined`.
   */
  protected async addWithin(
    client: pg.Pool | pg.PoolClient,
    userExternalId: string,
    ownerExternalId: string,
    data: TData,
  ): Promise<TOutput | undefined> {
    // Auto-set primary if this is the first entry.
    if (this.config.hasPrimaryFlag && this.config.setIsPrimary !== undefined) {
      const existing = await this.config.listFn({ userExternalId, ownerExternalId }, client);
      if (existing.length === 0) {
        data = this.config.setIsPrimary(data, true);
      }
    }

    if (
      this.config.hasPrimaryFlag &&
      this.config.clearPrimaryFn !== undefined &&
      this.config.isPrimary?.(data) === true
    ) {
      await this.config.clearPrimaryFn({ userExternalId, ownerExternalId }, client);
    }

    const result = await this.write(() =>
      this.config.createFn({ userExternalId, ownerExternalId, data }, client),
    );
    if (result === undefined) {
      return undefined;
    }
    return this.config.mapResult(result);
  }

  /**
   * Update an existing sub-resource.
   *
   * Always runs in its own transaction, and rolls back when the update matched
   * no row so a cleared primary flag is never left behind.
   */
  public async update(
    userExternalId: string,
    ownerExternalId: string,
    resourceExternalId: string,
    data: TData,
  ): Promise<TOutput> {
    this.logger.debug(
      { ownerExternalId, resourceExternalId, resource: this.config.resourceName },
      'Updating sub-resource',
    );

    return withTransaction(this.db, async (txClient) => {
      if (
        this.config.hasPrimaryFlag &&
        this.config.clearPrimaryFn !== undefined &&
        this.config.isPrimary?.(data) === true
      ) {
        await this.config.clearPrimaryFn({ userExternalId, ownerExternalId }, txClient);
      }

      const result = await this.write(() =>
        this.config.updateFn(
          { userExternalId, ownerExternalId, resourceExternalId, data },
          txClient,
        ),
      );
      if (result === undefined) {
        throw new ResourceNotFoundError(this.config.resourceLabel, resourceExternalId);
      }
      return this.config.mapResult(result);
    });
  }

  /**
   * Delete a sub-resource.
   */
  public async delete(userExternalId: string, ownerExternalId: string, resourceExternalId: string) {
    this.logger.debug(
      { ownerExternalId, resourceExternalId, resource: this.config.resourceName },
      'Deleting sub-resource',
    );

    const deleted = await this.config.deleteFn(
      { userExternalId, ownerExternalId, resourceExternalId },
      this.db,
    );
    if (deleted.length === 0) {
      throw new ResourceNotFoundError(this.config.resourceLabel, resourceExternalId);
    }
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
  public async createMany(
    userExternalId: string,
    ownerExternalId: string,
    inputs: TData[],
    client: pg.Pool | pg.PoolClient,
  ): Promise<TOutput[]> {
    const results: TOutput[] = [];
    for (const data of inputs) {
      const created = await this.addWithin(client, userExternalId, ownerExternalId, data);
      if (created !== undefined) {
        results.push(created);
      }
    }
    return results;
  }
}
