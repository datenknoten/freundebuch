import type { AppError } from '@datenknoten/kit';
import type { Type } from 'arktype';
import { type Context, Hono } from 'hono';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error.js';
import { getAuthUser } from '../../middleware/auth.js';
import type { AppContext } from '../../types/context.js';
import { parseBody } from '../../utils/parse-body.js';
import { parseRawObject } from '../../utils/parse-raw-object.js';
import { requireUuidParam } from '../../utils/require-uuid-param.js';
import { validate } from '../../utils/validate.js';

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

export interface SubResourceRouterConfig<TSchema extends Type, TOutput> {
  /** Path param carrying the owner id, as mounted by the parent router. */
  ownerParam: string;
  /** Human-readable owner name for the "Invalid …" validation message. */
  ownerLabel: string;
  /** Path param carrying the sub-resource id. */
  resourceParam: string;
  /** Human-readable resource name for 404s and the delete message. */
  resourceLabel: string;
  /**
   * Generic over the schema, not its input type, so schemas declaring ArkType
   * defaults work: the service receives the *validated* shape.
   */
  schema: TSchema;
  /** Error class raised with the owner id when the owner does not exist or is not the user's. */
  ownerNotFound: new (
    ownerId: string,
  ) => AppError;
  service: SubResourceOperations<TSchema['infer'], TOutput>;
  /**
   * Optional body rewrite before validation, for inputs the client cannot be
   * expected to send in canonical form (phone numbers).
   */
  preprocess?: (
    userId: string,
    ownerId: string,
    body: Record<string, unknown>,
    acceptLanguage: string | undefined,
  ) => Promise<Record<string, unknown>>;
}

/**
 * Build the standard list/add/update/delete router for a sub-resource.
 *
 * Eleven route files were the same forty lines with different nouns. The ones
 * that are genuinely different — singleton met-info, relationships with their
 * inverse edges, collective circle join/leave verbs — stay hand-written.
 */
export function createSubResourceRouter<TSchema extends Type, TOutput>(
  config: SubResourceRouterConfig<TSchema, TOutput>,
): Hono<AppContext> {
  const app = new Hono<AppContext>();

  const readBody = async (
    c: Context<AppContext>,
    userId: string,
    ownerId: string,
  ): Promise<TSchema['infer']> => {
    if (!config.preprocess) {
      return parseBody(c, config.schema);
    }
    const raw = await parseRawObject(c);
    return validate(
      config.schema,
      await config.preprocess(userId, ownerId, raw, c.req.header('Accept-Language')),
    );
  };

  app.get('/', async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);

    return c.json(await config.service.list(user.userId, ownerId));
  });

  app.post('/', async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const input = await readBody(c, user.userId, ownerId);

    const created = await config.service.add(user.userId, ownerId, input);
    if (created === null) {
      throw new config.ownerNotFound(ownerId);
    }

    return c.json(created, 201);
  });

  app.put(`/:${config.resourceParam}`, async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const resourceId = requireUuidParam(c, config.resourceParam, `${config.resourceLabel} ID`);
    const input = await readBody(c, user.userId, ownerId);

    const updated = await config.service.update(user.userId, ownerId, resourceId, input);
    if (updated === null) {
      throw new ResourceNotFoundError(config.resourceLabel, resourceId);
    }

    return c.json(updated);
  });

  app.delete(`/:${config.resourceParam}`, async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const resourceId = requireUuidParam(c, config.resourceParam, `${config.resourceLabel} ID`);

    const deleted = await config.service.delete(user.userId, ownerId, resourceId);
    if (deleted === null || deleted === false) {
      throw new ResourceNotFoundError(config.resourceLabel, resourceId);
    }

    return c.json({ message: `${config.resourceLabel} deleted successfully` });
  });

  return app;
}
