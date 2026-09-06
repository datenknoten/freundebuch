import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectivesService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { requireUuidParam } from '../../../utils/http.js';

const app = new Hono<AppContext>();

/**
 * GET /api/friends/:id/collectives
 * Get all collectives this friend belongs to
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');

  const collectivesService = new CollectivesService(db);
  const collectives = await collectivesService.getCollectivesForContact(user.userId, friendId);

  return c.json(collectives);
});

export default app;
