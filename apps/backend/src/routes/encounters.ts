import { ValidationError } from '@datenknoten/kit';
import {
  type EncounterCreateInput,
  EncounterCreateInputSchema,
  EncounterListQuerySchema,
  type EncounterUpdateInput,
  EncounterUpdateInputSchema,
  parseEncounterListQuery,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono, type MiddlewareHandler } from 'hono';
import { getAuthUser } from '../middleware/auth.js';
import type { EncountersService } from '../services/encounters.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

function mapEncounterCreateInput(input: EncounterCreateInput) {
  return {
    title: input.title,
    encounterDate: input.encounter_date,
    encounterType: input.encounter_type,
    friendIds: input.friend_ids,
    locationText: input.location_text,
    description: input.description,
  };
}

/** Only present keys are set: an absent key leaves the field untouched. */
function mapEncounterUpdateInput(input: EncounterUpdateInput) {
  return {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.encounter_date === undefined ? {} : { encounterDate: input.encounter_date }),
    ...(input.encounter_type === undefined ? {} : { encounterType: input.encounter_type }),
    ...(input.friend_ids === undefined ? {} : { friendIds: input.friend_ids }),
    ...(input.location_text === undefined ? {} : { locationText: input.location_text }),
    ...(input.description === undefined ? {} : { description: input.description }),
  };
}

export interface EncountersRoutesOptions {
  encountersService: EncountersService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createEncountersRoutes(options: EncountersRoutesOptions) {
  const { encountersService, authMiddleware, onboardingMiddleware, rateLimitMiddleware } = options;
  const app = new Hono<AppContext>();

  app.use('*', authMiddleware);
  app.use('*', rateLimitMiddleware);
  app.use('*', onboardingMiddleware);

  app.get('/', async (c) => {
    const user = getAuthUser(c);

    const query = c.req.query();
    const validated = EncounterListQuerySchema(query);

    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    const listOptions = parseEncounterListQuery(validated);
    const result = await encountersService.listEncounters(user.userId, listOptions);

    return c.json(result);
  });

  app.post('/', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, EncounterCreateInputSchema);
    const encounter = await encountersService.createEncounter(
      user.userId,
      mapEncounterCreateInput(validated),
    );

    return c.json(encounter, 201);
  });

  app.get('/:id', async (c) => {
    const user = getAuthUser(c);
    const encounterId = requireUuidParam(c, 'id', 'encounter ID');
    const encounter = await encountersService.getEncounter(user.userId, encounterId);

    return c.json(encounter);
  });

  app.put('/:id', async (c) => {
    const user = getAuthUser(c);
    const encounterId = requireUuidParam(c, 'id', 'encounter ID');
    const validated = await parseBody(c, EncounterUpdateInputSchema);
    const encounter = await encountersService.updateEncounter(
      user.userId,
      encounterId,
      mapEncounterUpdateInput(validated),
    );

    return c.json(encounter);
  });

  app.delete('/:id', async (c) => {
    const user = getAuthUser(c);
    const encounterId = requireUuidParam(c, 'id', 'encounter ID');
    await encountersService.deleteEncounter(user.userId, encounterId);

    return c.json({ success: true });
  });

  return app;
}
