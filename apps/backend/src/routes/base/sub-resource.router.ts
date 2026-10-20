import type { Type } from 'arktype';
import { type Context, Hono } from 'hono';
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
export interface SubResourceOperations<TData, TOutput> {
  list(userExternalId: string, ownerExternalId: string): Promise<TOutput[]>;
  add(userExternalId: string, ownerExternalId: string, data: TData): Promise<TOutput>;
  update(
    userExternalId: string,
    ownerExternalId: string,
    resourceExternalId: string,
    data: TData,
  ): Promise<TOutput>;
  delete(
    userExternalId: string,
    ownerExternalId: string,
    resourceExternalId: string,
  ): Promise<void>;
}

export interface SubResourceRouterConfig<TSchema extends Type, TData, TOutput> {
  /** Path param carrying the owner id, as mounted by the parent router. */
  ownerParam: string;
  /** Human-readable owner name for the "Invalid …" validation message. */
  ownerLabel: string;
  /** Path param carrying the sub-resource id. */
  resourceParam: string;
  /** Human-readable resource name for the "Invalid … ID" message and the delete message. */
  resourceLabel: string;
  /**
   * Generic over the schema, not its input type, so schemas declaring ArkType
   * defaults work: `mapInput` receives the *validated* shape.
   */
  schema: TSchema;
  mapInput: (input: TSchema['infer']) => TData;
  service: SubResourceOperations<TData, TOutput>;
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
export function createSubResourceRouter<TSchema extends Type, TData, TOutput>(
  config: SubResourceRouterConfig<TSchema, TData, TOutput>,
): Hono<AppContext> {
  const app = new Hono<AppContext>();

  async function readBody(c: Context<AppContext>, userId: string, ownerId: string) {
    if (config.preprocess === undefined) {
      return config.mapInput(await parseBody(c, config.schema));
    }
    const raw = await parseRawObject(c);
    const preprocessed = await config.preprocess(
      userId,
      ownerId,
      raw,
      c.req.header('Accept-Language'),
    );
    return config.mapInput(validate(config.schema, preprocessed));
  }

  app.get('/', async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);

    return c.json(await config.service.list(user.userId, ownerId));
  });

  app.post('/', async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const data = await readBody(c, user.userId, ownerId);

    return c.json(await config.service.add(user.userId, ownerId, data), 201);
  });

  app.put(`/:${config.resourceParam}`, async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const resourceId = requireUuidParam(c, config.resourceParam, `${config.resourceLabel} ID`);
    const data = await readBody(c, user.userId, ownerId);

    return c.json(await config.service.update(user.userId, ownerId, resourceId, data));
  });

  app.delete(`/:${config.resourceParam}`, async (c) => {
    const user = getAuthUser(c);
    const ownerId = requireUuidParam(c, config.ownerParam, config.ownerLabel);
    const resourceId = requireUuidParam(c, config.resourceParam, `${config.resourceLabel} ID`);

    await config.service.delete(user.userId, ownerId, resourceId);

    return c.json({ message: `${config.resourceLabel} deleted successfully` });
  });

  return app;
}
