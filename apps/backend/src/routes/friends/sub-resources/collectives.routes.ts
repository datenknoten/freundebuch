import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import type { CollectivesService } from '../../../services/collectives/collectives.service.js';
import type { AppContext } from '../../../types/context.js';
import { requireUuidParam } from '../../../utils/require-uuid-param.js';

export interface CollectivesRoutesOptions {
  collectivesService: CollectivesService;
}

export function createCollectivesRoutes(options: CollectivesRoutesOptions) {
  const app = new Hono<AppContext>();

  app.get('/', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const collectives = await options.collectivesService.getCollectivesForContact(
      user.userId,
      friendId,
    );

    return c.json(collectives);
  });

  return app;
}
