import { EncounterListQuerySchema, parseEncounterListQuery } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { EncountersService } from '../../../services/encounters.service.js';
import type { AppContext } from '../../../types/context.js';
import { ResourceNotFoundError, ValidationError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * GET /api/friends/:id/encounters
 * Get all encounters with a specific friend
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  const query = c.req.query();
  const validated = EncounterListQuerySchema(query);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  // Force filter by this friend
  const options = parseEncounterListQuery({ ...validated, friend_id: friendId });

  const encountersService = new EncountersService(db);
  const result = await encountersService.listEncounters(user.userId, options);

  return c.json(result);
});

/**
 * GET /api/friends/:id/last-encounter
 * Get the most recent encounter with a specific friend
 */
app.get('/last', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';

  if (!isValidUuid(friendId)) {
    throw new ValidationError('Invalid friend ID');
  }

  const encountersService = new EncountersService(db);
  const lastEncounter = await encountersService.getLastEncounterForFriend(user.userId, friendId);

  if (!lastEncounter) {
    throw new ResourceNotFoundError('Encounters');
  }

  return c.json(lastEncounter);
});

export default app;
