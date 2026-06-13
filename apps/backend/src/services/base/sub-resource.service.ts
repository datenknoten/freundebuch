import type pg from 'pg';
import type { Logger } from 'pino';
import { withTransaction } from '../../utils/db.js';

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

  /** Optional function to count existing resources (for auto-primary) */
  countFn?: (
    params: { userExternalId: string; ownerExternalId: string },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<unknown[]>;

  /** Optional function to list all resources for an owner */
  listFn?: (
    params: { userExternalId: string; ownerExternalId: string },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TListResult[]>;

  /** Function to map a list result to output type (required if listFn is set) */
  mapListResult?: (result: TListResult) => TOutput;

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
   * List all sub-resources for an owner. Only available when the config
   * provides listFn + mapListResult.
   */
  async list(userExternalId: string, ownerExternalId: string): Promise<TOutput[]> {
    if (!this.config.listFn || !this.config.mapListResult) {
      throw new Error(`${this.config.resourceName} service does not support list()`);
    }
    this.logger.debug({ ownerExternalId }, `Listing ${this.config.resourceName}s`);
    const rows = await this.config.listFn({ userExternalId, ownerExternalId }, this.db);
    return rows.map(this.config.mapListResult);
  }

  /**
   * Add a new sub-resource to an owner.
   */
  async add(
    userExternalId: string,
    ownerExternalId: string,
    input: TInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<TOutput | null> {
    this.logger.debug({ ownerExternalId }, `Adding ${this.config.resourceName}`);

    const dbClient = client ?? this.db;

    // Auto-set primary if this is the first entry.
    const counter = this.config.countFn ?? this.config.listFn;
    if (this.config.hasPrimaryFlag && counter && this.config.setIsPrimary) {
      const existing = await counter({ userExternalId, ownerExternalId }, dbClient);
      if (existing.length === 0) {
        input = this.config.setIsPrimary(input, true);
      }
    }

    const needsPrimaryUpdate = Boolean(
      this.config.hasPrimaryFlag && this.config.clearPrimaryFn && this.config.isPrimary?.(input),
    );

    // Clearing the old primary and creating the new row must be atomic to
    // avoid leaving zero or two primaries under concurrent writes. If a caller
    // already supplied a transaction client, run inline within it.
    if (needsPrimaryUpdate && !client) {
      return withTransaction(this.db, async (txClient) => {
        await this.config.clearPrimaryFn?.({ userExternalId, ownerExternalId }, txClient);
        const [result] = await this.config.createFn(
          { userExternalId, ownerExternalId, input },
          txClient,
        );
        return result ? this.config.mapResult(result) : null;
      });
    }

    if (needsPrimaryUpdate) {
      await this.config.clearPrimaryFn?.({ userExternalId, ownerExternalId }, dbClient);
    }

    const [result] = await this.config.createFn(
      { userExternalId, ownerExternalId, input },
      dbClient,
    );
    if (!result) {
      return null;
    }
    return this.config.mapResult(result);
  }

  /**
   * Update an existing sub-resource.
   */
  async update(
    userExternalId: string,
    ownerExternalId: string,
    resourceExternalId: string,
    input: TInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<TOutput | null> {
    this.logger.debug(
      { ownerExternalId, resourceExternalId },
      `Updating ${this.config.resourceName}`,
    );

    const needsPrimaryUpdate = Boolean(
      this.config.hasPrimaryFlag && this.config.clearPrimaryFn && this.config.isPrimary?.(input),
    );

    if (needsPrimaryUpdate && !client) {
      return withTransaction(this.db, async (txClient) => {
        await this.config.clearPrimaryFn?.({ userExternalId, ownerExternalId }, txClient);
        const [result] = await this.config.updateFn(
          { userExternalId, ownerExternalId, resourceExternalId, input },
          txClient,
        );
        return result ? this.config.mapResult(result) : null;
      });
    }

    const dbClient = client ?? this.db;

    if (needsPrimaryUpdate) {
      await this.config.clearPrimaryFn?.({ userExternalId, ownerExternalId }, dbClient);
    }

    const [result] = await this.config.updateFn(
      { userExternalId, ownerExternalId, resourceExternalId, input },
      dbClient,
    );
    if (!result) {
      return null;
    }
    return this.config.mapResult(result);
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
   * Create multiple sub-resources for an owner.
   */
  async createMany(
    userExternalId: string,
    ownerExternalId: string,
    inputs: TInput[],
    client?: pg.Pool | pg.PoolClient,
  ): Promise<TOutput[]> {
    const results: TOutput[] = [];
    for (const input of inputs) {
      const created = await this.add(userExternalId, ownerExternalId, input, client);
      if (created) {
        results.push(created);
      }
    }
    return results;
  }
}
