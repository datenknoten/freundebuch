import type pg from 'pg';
import type { Logger } from 'pino';

/**
 * Configuration for a collective sub-resource service.
 * Defines how to create, update, delete, and map sub-resources.
 */
export interface CollectiveSubResourceConfig<
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

  /** Function to list all resources for a collective */
  listFn: (
    params: {
      userExternalId: string;
      collectiveExternalId: string;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TListResult[]>;

  /** Function to map list result to output type */
  mapListResult: (result: TListResult) => TOutput;

  /** Function to create a new resource */
  createFn: (
    params: {
      userExternalId: string;
      collectiveExternalId: string;
      input: TInput;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TCreateResult[]>;

  /** Function to update an existing resource */
  updateFn: (
    params: {
      userExternalId: string;
      collectiveExternalId: string;
      resourceExternalId: string;
      input: TInput;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TUpdateResult[]>;

  /** Function to delete a resource */
  deleteFn: (
    params: {
      userExternalId: string;
      collectiveExternalId: string;
      resourceExternalId: string;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TDeleteResult[]>;

  /** Optional function to clear primary flag before setting a new primary */
  clearPrimaryFn?: (
    params: {
      userExternalId: string;
      collectiveExternalId: string;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<unknown>;

  /** Function to check if input has primary flag set */
  isPrimary?: (input: TInput) => boolean;

  /** Function to map database result to output type */
  mapResult: (result: TCreateResult | TUpdateResult) => TOutput;
}

export interface CollectiveSubResourceServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * Abstract base class for collective sub-resource services.
 * Provides common CRUD operations for collective sub-resources like phones, emails, etc.
 */
export abstract class CollectiveSubResourceService<
  TInput,
  TOutput,
  TCreateResult,
  TUpdateResult,
  TDeleteResult,
  TListResult = TCreateResult,
> {
  protected db: pg.Pool;
  protected logger: Logger;
  protected config: CollectiveSubResourceConfig<
    TInput,
    TOutput,
    TCreateResult,
    TUpdateResult,
    TDeleteResult,
    TListResult
  >;

  constructor(
    options: CollectiveSubResourceServiceOptions,
    config: CollectiveSubResourceConfig<
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
   * List all sub-resources for a collective
   */
  async list(userExternalId: string, collectiveExternalId: string): Promise<TOutput[]> {
    this.logger.debug({ collectiveExternalId }, `Listing ${this.config.resourceName}s`);

    const rows = await this.config.listFn({ userExternalId, collectiveExternalId }, this.db);

    return rows.map(this.config.mapListResult);
  }

  /**
   * Add a new sub-resource to a collective
   */
  async add(
    userExternalId: string,
    collectiveExternalId: string,
    input: TInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<TOutput | null> {
    this.logger.debug({ collectiveExternalId }, `Adding ${this.config.resourceName}`);

    const needsPrimaryUpdate =
      this.config.hasPrimaryFlag && this.config.clearPrimaryFn && this.config.isPrimary?.(input);

    // Use a transaction for clear+set primary to prevent race conditions
    if (needsPrimaryUpdate && !client) {
      return this.withTransaction(async (txClient) => {
        await this.config.clearPrimaryFn!({ userExternalId, collectiveExternalId }, txClient);
        const [result] = await this.config.createFn(
          { userExternalId, collectiveExternalId, input },
          txClient,
        );
        return result ? this.config.mapResult(result) : null;
      });
    }

    const dbClient = client ?? this.db;

    if (needsPrimaryUpdate) {
      await this.config.clearPrimaryFn!({ userExternalId, collectiveExternalId }, dbClient);
    }

    const [result] = await this.config.createFn(
      { userExternalId, collectiveExternalId, input },
      dbClient,
    );

    if (!result) {
      return null;
    }

    return this.config.mapResult(result);
  }

  /**
   * Update an existing sub-resource
   */
  async update(
    userExternalId: string,
    collectiveExternalId: string,
    resourceExternalId: string,
    input: TInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<TOutput | null> {
    this.logger.debug(
      { collectiveExternalId, resourceExternalId },
      `Updating ${this.config.resourceName}`,
    );

    const needsPrimaryUpdate =
      this.config.hasPrimaryFlag && this.config.clearPrimaryFn && this.config.isPrimary?.(input);

    // Use a transaction for clear+set primary to prevent race conditions
    if (needsPrimaryUpdate && !client) {
      return this.withTransaction(async (txClient) => {
        await this.config.clearPrimaryFn!({ userExternalId, collectiveExternalId }, txClient);
        const [result] = await this.config.updateFn(
          { userExternalId, collectiveExternalId, resourceExternalId, input },
          txClient,
        );
        return result ? this.config.mapResult(result) : null;
      });
    }

    const dbClient = client ?? this.db;

    if (needsPrimaryUpdate) {
      await this.config.clearPrimaryFn!({ userExternalId, collectiveExternalId }, dbClient);
    }

    const [result] = await this.config.updateFn(
      { userExternalId, collectiveExternalId, resourceExternalId, input },
      dbClient,
    );

    if (!result) {
      return null;
    }

    return this.config.mapResult(result);
  }

  /**
   * Delete a sub-resource
   */
  async delete(
    userExternalId: string,
    collectiveExternalId: string,
    resourceExternalId: string,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<boolean> {
    this.logger.debug(
      { collectiveExternalId, resourceExternalId },
      `Deleting ${this.config.resourceName}`,
    );

    const dbClient = client ?? this.db;

    const result = await this.config.deleteFn(
      { userExternalId, collectiveExternalId, resourceExternalId },
      dbClient,
    );

    return result.length > 0;
  }

  /**
   * Execute a function within a database transaction
   */
  private async withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors to preserve the original error
      }
      throw error;
    } finally {
      try {
        client.release();
      } catch {
        // Prevent connection leak from masking the original error
      }
    }
  }
}
