import {
  EncounterInputSchema,
  EncounterListQuerySchema,
  EncounterUpdateSchema,
  type ErrorResponse,
  parseEncounterListQuery,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { encountersRateLimitMiddleware } from '../middleware/rate-limit.js';
import { EncountersService } from '../services/encounters.service.js';
import type { AppContext } from '../types/context.js';
import { isAppError, toError } from '../utils/errors.js';
import { isValidUuid } from '../utils/security.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all encounter routes
app.use('*', authMiddleware);
// Apply rate limiting to prevent abuse
app.use('*', encountersRateLimitMiddleware);
// Apply onboarding middleware to require self-friend before using encounters
app.use('*', onboardingMiddleware);

// ============================================================================
// Encounter CRUD Routes
// ============================================================================

/**
 * GET /api/encounters
 * List all encounters for the authenticated user with pagination and filtering
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const query = c.req.query();
    const validated = EncounterListQuerySchema(query);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
    }

    const options = parseEncounterListQuery(validated);

    // Validate friend_id if provided
    if (options.friendId && !isValidUuid(options.friendId)) {
      return c.json<ErrorResponse>({ error: 'Invalid friend_id' }, 400);
    }

    const encountersService = new EncountersService(db);
    const result = await encountersService.listEncounters(user.userId, options);

    return c.json(result);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list encounters');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to list encounters');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list encounters' }, 500);
  }
});

/**
 * POST /api/encounters
 * Create a new encounter
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const body = await c.req.json();
    const validated = EncounterInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    // Validate all friend IDs
    for (const friendId of validated.friend_ids) {
      if (!isValidUuid(friendId)) {
        return c.json<ErrorResponse>({ error: `Invalid friend ID: ${friendId}` }, 400);
      }
    }

    const encountersService = new EncountersService(db);
    const encounter = await encountersService.createEncounter(user.userId, validated);

    return c.json(encounter, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to create encounter');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to create encounter');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to create encounter' }, 500);
  }
});

/**
 * GET /api/encounters/:id
 * Get a single encounter by ID
 */
app.get('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const encounterId = c.req.param('id');

  if (!isValidUuid(encounterId)) {
    return c.json<ErrorResponse>({ error: 'Invalid encounter ID' }, 400);
  }

  try {
    const encountersService = new EncountersService(db);
    const encounter = await encountersService.getEncounterById(user.userId, encounterId);

    if (!encounter) {
      return c.json<ErrorResponse>({ error: 'Encounter not found' }, 404);
    }

    return c.json(encounter);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get encounter');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, encounterId }, 'Failed to get encounter');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get encounter' }, 500);
  }
});

/**
 * PUT /api/encounters/:id
 * Update an encounter
 */
app.put('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const encounterId = c.req.param('id');

  if (!isValidUuid(encounterId)) {
    return c.json<ErrorResponse>({ error: 'Invalid encounter ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const validated = EncounterUpdateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    // Validate all friend IDs if provided
    if (validated.friend_ids) {
      for (const friendId of validated.friend_ids) {
        if (!isValidUuid(friendId)) {
          return c.json<ErrorResponse>({ error: `Invalid friend ID: ${friendId}` }, 400);
        }
      }
    }

    const encountersService = new EncountersService(db);
    const encounter = await encountersService.updateEncounter(user.userId, encounterId, validated);

    if (!encounter) {
      return c.json<ErrorResponse>({ error: 'Encounter not found' }, 404);
    }

    return c.json(encounter);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update encounter');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, encounterId }, 'Failed to update encounter');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update encounter' }, 500);
  }
});

/**
 * DELETE /api/encounters/:id
 * Delete an encounter
 */
app.delete('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const encounterId = c.req.param('id');

  if (!isValidUuid(encounterId)) {
    return c.json<ErrorResponse>({ error: 'Invalid encounter ID' }, 400);
  }

  try {
    const encountersService = new EncountersService(db);
    const deleted = await encountersService.deleteEncounter(user.userId, encounterId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Encounter not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to delete encounter');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, encounterId }, 'Failed to delete encounter');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete encounter' }, 500);
  }
});

export default app;
