import type { ErrorResponse } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectivesService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { toError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * GET /api/friends/:id/collectives
 * Get all collectives this friend belongs to
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
    const collectivesService = new CollectivesService(db);
    const collectives = await collectivesService.getCollectivesForContact(user.userId, friendId);

    return c.json(collectives);
  } catch (error) {
    const err = toError(error);
    logger.error({ err, friendId }, 'Failed to get collectives for friend');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get collectives' }, 500);
  }
});

export default app;
