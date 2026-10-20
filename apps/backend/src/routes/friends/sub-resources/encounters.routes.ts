import { ValidationError } from '@datenknoten/kit';
import { EncounterListQuerySchema, parseEncounterListQuery } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import type { EncountersService } from '../../../services/encounters.service.js';
import type { AppContext } from '../../../types/context.js';
import { requireUuidParam } from '../../../utils/require-uuid-param.js';

export interface EncountersRoutesOptions {
  encountersService: EncountersService;
}

export function createEncountersRoutes(options: EncountersRoutesOptions) {
  const app = new Hono<AppContext>();

  app.get('/', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const query = c.req.query();
    const validated = EncounterListQuerySchema(query);

    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    // Force filter by this friend
    const listOptions = parseEncounterListQuery({ ...validated, friend_id: friendId });

    const result = await options.encountersService.listEncounters(user.userId, listOptions);

    return c.json(result);
  });

  app.get('/last', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const lastEncounter = await options.encountersService.getLastEncounterForFriend(
      user.userId,
      friendId,
    );

    return c.json(lastEncounter);
  });

  return app;
}
