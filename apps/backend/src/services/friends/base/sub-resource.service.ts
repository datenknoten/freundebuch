import type pg from 'pg';
import type { Logger } from 'pino';

/**
 * Configuration for a sub-resource service.
 * Defines how to create, update, delete, and map sub-resources.
 */
export interface SubResourceConfig<TInput, TOutput, TCreateResult, TUpdateResult, TDeleteResult> {
  /** Name of the resource for logging purposes */
  resourceName: string;

  /** Whether this resource supports a primary flag */
  hasPrimaryFlag: boolean;

  /** Function to create a new resource */
  createFn: (
    params: {
      userExternalId: string;
      friendExternalId: string;
      input: TInput;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TCreateResult[]>;

  /** Function to update an existing resource */
  updateFn: (
    params: {
      userExternalId: string;
      friendExternalId: string;
      resourceExternalId: string;
      input: TInput;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TUpdateResult[]>;

  /** Function to delete a resource */
  deleteFn: (
    params: {
      userExternalId: string;
      friendExternalId: string;
      resourceExternalId: string;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<TDeleteResult[]>;

  /** Optional function to clear primary flag before setting a new primary */
  clearPrimaryFn?: (
    params: {
      userExternalId: string;
      friendExternalId: string;
    },
    client: pg.Pool | pg.PoolClient,
  ) => Promise<unknown>;

  /** Function to check if input has primary flag set */
  isPrimary?: (input: TInput) => boolean;

  /** Function to map database result to output type */
  mapResult: (result: TCreateResult | TUpdateResult) => TOutput;
}

export interface SubResourceServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

/**
 * Abstract base class for sub-resource services.
 * Provides common CRUD operations for friend sub-resources like phones, emails, etc.
 */
export abstract class SubResourceService<
  TInput,
  TOutput,
  TCreateResult,
  TUpdateResult,
  TDeleteResult,
> {
  protected db: pg.Pool;
  protected logger: Logger;
  protected config: SubResourceConfig<TInput, TOutput, TCreateResult, TUpdateResult, TDeleteResult>;

  constructor(
    options: SubResourceServiceOptions,
    config: SubResourceConfig<TInput, TOutput, TCreateResult, TUpdateResult, TDeleteResult>,
  ) {
    this.db = options.db;
    this.logger = options.logger;
    this.config = config;
  }

  /**
   * Add a new sub-resource to a friend
   */
  async add(
    userExternalId: string,
    friendExternalId: string,
    input: TInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<TOutput | null> {
    this.logger.debug({ friendExternalId }, `Adding ${this.config.resourceName}`);

    const dbClient = client ?? this.db;

    // If setting as primary and a clear function exists, clear existing primary
    if (
      this.config.hasPrimaryFlag &&
      this.config.clearPrimaryFn &&
      this.config.isPrimary?.(input)
    ) {
      await this.config.clearPrimaryFn({ userExternalId, friendExternalId }, dbClient);
    }

    const [result] = await this.config.createFn(
      { userExternalId, friendExternalId, input },
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
    friendExternalId: string,
    resourceExternalId: string,
    input: TInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<TOutput | null> {
    this.logger.debug(
      { friendExternalId, resourceExternalId },
      `Updating ${this.config.resourceName}`,
    );

    const dbClient = client ?? this.db;

    // If setting as primary and a clear function exists, clear existing primary
    if (
      this.config.hasPrimaryFlag &&
      this.config.clearPrimaryFn &&
      this.config.isPrimary?.(input)
    ) {
      await this.config.clearPrimaryFn({ userExternalId, friendExternalId }, dbClient);
    }

    const [result] = await this.config.updateFn(
      { userExternalId, friendExternalId, resourceExternalId, input },
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
    friendExternalId: string,
    resourceExternalId: string,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<boolean> {
    this.logger.debug(
      { friendExternalId, resourceExternalId },
      `Deleting ${this.config.resourceName}`,
    );

    const dbClient = client ?? this.db;

    const result = await this.config.deleteFn(
      { userExternalId, friendExternalId, resourceExternalId },
      dbClient,
    );

    return result.length > 0;
  }

  /**
   * Create multiple sub-resources for a friend
   */
  async createMany(
    userExternalId: string,
    friendExternalId: string,
    inputs: TInput[],
    client?: pg.Pool | pg.PoolClient,
  ): Promise<TOutput[]> {
    const results: TOutput[] = [];

    for (const input of inputs) {
      const created = await this.add(userExternalId, friendExternalId, input, client);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }
}
