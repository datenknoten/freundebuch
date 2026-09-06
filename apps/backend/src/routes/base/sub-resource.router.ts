import type { Type } from 'arktype';
import { type Context, Hono } from 'hono';
import { getAuthUser } from '../../middleware/auth.js';
import type { AppContext } from '../../types/context.js';
import type { AppError } from '../../utils/errors.js';
import { ResourceNotFoundError } from '../../utils/errors.js';
import { parseBody, parseRawObject, requireUuidParam, validate } from '../../utils/http.js';

/**
 * The slice of `SubResourceService` a generated router needs. Declared
 * structurally so `DateService` — which has the same four methods but its own
 * birthday rules and no base class — fits too.
 */
export interface SubResourceOperations<TInput, TOutput> {
  list(userExternalId: string, ownerExternalId: string): Promise<TOutput[]>;
  add(userExternalId: string, ownerExternalId: string, input: TInput): Promise<TOutput | null>;
  update(
    userExternalId: string,
    ownerExternalId: string,
    resourceExternalId: string,
    input: TInput,
  ): Promise<TOutput | null>;
  delete(
    userExternalId: string,
    ownerExternalId: string,
    resourceExternalId: string,
  ): Promise<unknown>;
}

export interface SubResourceRouterConfig<TInput, TOutput> {
  /** Path param carrying the owner id, as mounted by the parent router. */
  ownerParam: string;
  /** Human-readable owner name for the "Invalid …" validation message. */
  ownerLabel: string;
  /** Path param carrying the sub-resource id. */
  resourceParam: string;
  /** Human-readable resource name for 404s and the delete message. */
  resourceLabel: string;
  schema: Type<TInput>;
  /** Error to raise when the owner does not exist or is not the user's. */
  ownerNotFound: () => AppError;
  service: (c: Context<AppContext>) => SubResourceOperations<TInput, TOutput>;
  /**
   * Optional body rewrite before validation, for inputs the client cannot be
   * expected to send in canonical form (phone numbers).
   */
  preprocess?: (
    c: Context<AppContext>,
    userId: string,
    ownerId: string,
    body: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
}

/**
 * Build the standard list/add/update/delete router for a sub-resource.
 *
 * Eleven route files were the same forty lines with different nouns. The ones
 * that are genuinely different — singleton met-info, relationships with their
 * inverse edges, collective circle join/leave verbs — stay hand-written.
 */
export function createSubResourceRouter<TInput, TOutput>(
  config: SubResourceRouterConfig<TInput, TOutput>,
): Hono<AppContext> {
  const app = new Hono<AppContext>();

  const readBody = async (
    c: Context<AppContext>,
    userId: string,
    ownerId: string,
  ): Promise<TInput> => {
    if (!config.preprocess) {
      return parseBody(c, config.schema);
    }
    const raw = await parseRawObject(c);
    return validate(config.schema, await config.preprocess(c, userId, ownerId, raw));
  };

  app.get('/', async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);

    return c.json(await config.service(c).list(user.userId, ownerId));
  });

  app.post('/', async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const input = await readBody(c, user.userId, ownerId);

    const created = await config.service(c).add(user.userId, ownerId, input);
    if (created === null) {
      throw config.ownerNotFound();
    }

    return c.json(created, 201);
  });

  app.put(`/:${config.resourceParam}`, async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const resourceId = requireUuidParam(c, config.resourceParam, `${config.resourceLabel} ID`);
    const input = await readBody(c, user.userId, ownerId);

    const updated = await config.service(c).update(user.userId, ownerId, resourceId, input);
    if (updated === null) {
      throw new ResourceNotFoundError(config.resourceLabel);
    }

    return c.json(updated);
  });

  app.delete(`/:${config.resourceParam}`, async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const resourceId = requireUuidParam(c, config.resourceParam, `${config.resourceLabel} ID`);

    const deleted = await config.service(c).delete(user.userId, ownerId, resourceId);
    if (deleted === null || deleted === false) {
      throw new ResourceNotFoundError(config.resourceLabel);
    }

    return c.json({ message: `${config.resourceLabel} deleted successfully` });
  });

  return app;
}
