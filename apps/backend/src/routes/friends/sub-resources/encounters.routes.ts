import {
  EncounterListQuerySchema,
  type ErrorResponse,
  parseEncounterListQuery,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { EncountersService } from '../../../services/encounters.service.js';
import type { AppContext } from '../../../types/context.js';
import { isAppError, toError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * GET /api/friends/:id/encounters
 * Get all encounters with a specific friend
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const query = c.req.query();
    const validated = EncounterListQuerySchema(query);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
    }

    // Force filter by this friend
    const options = parseEncounterListQuery({ ...validated, friend_id: friendId });

    const encountersService = new EncountersService(db);
    const result = await encountersService.listEncounters(user.userId, options);

    return c.json(result);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get friend encounters');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to get friend encounters');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get friend encounters' }, 500);
  }
});

/**
 * GET /api/friends/:id/last-encounter
 * Get the most recent encounter with a specific friend
 */
app.get('/last', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = c.req.param('id') ?? '';

  if (!isValidUuid(friendId)) {
    return c.json<ErrorResponse>({ error: 'Invalid friend ID' }, 400);
  }

  try {
    const encountersService = new EncountersService(db);
    const lastEncounter = await encountersService.getLastEncounterForFriend(user.userId, friendId);

    if (!lastEncounter) {
      return c.json<ErrorResponse>({ error: 'No encounters found' }, 404);
    }

    return c.json(lastEncounter);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get last encounter');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to get last encounter');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get last encounter' }, 500);
  }
});

export default app;
