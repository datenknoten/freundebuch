import {
  EncounterInputSchema,
  EncounterListQuerySchema,
  EncounterUpdateSchema,
  parseEncounterListQuery,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { encountersRateLimitMiddleware } from '../middleware/rate-limit.js';
import { EncountersService } from '../services/encounters.service.js';
import type { AppContext } from '../types/context.js';
import { EncounterNotFoundError, ValidationError } from '../utils/errors.js';
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
  const db = c.get('db');
  const user = getAuthUser(c);

  const query = c.req.query();
  const validated = EncounterListQuerySchema(query);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  const options = parseEncounterListQuery(validated);

  // Validate friend_id if provided
  if (options.friendId && !isValidUuid(options.friendId)) {
    throw new ValidationError('Invalid friend_id');
  }

  const encountersService = new EncountersService(db);
  const result = await encountersService.listEncounters(user.userId, options);

  return c.json(result);
});

/**
 * POST /api/encounters
 * Create a new encounter
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);

  const body = await c.req.json();
  const validated = EncounterInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  // Validate all friend IDs
  for (const friendId of validated.friend_ids) {
    if (!isValidUuid(friendId)) {
      throw new ValidationError(`Invalid friend ID: ${friendId}`);
    }
  }

  const encountersService = new EncountersService(db);
  const encounter = await encountersService.createEncounter(user.userId, validated);

  return c.json(encounter, 201);
});

/**
 * GET /api/encounters/:id
 * Get a single encounter by ID
 */
app.get('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const encounterId = c.req.param('id');

  if (!isValidUuid(encounterId)) {
    throw new ValidationError('Invalid encounter ID');
  }

  const encountersService = new EncountersService(db);
  const encounter = await encountersService.getEncounterById(user.userId, encounterId);

  if (!encounter) {
    throw new EncounterNotFoundError();
  }

  return c.json(encounter);
});

/**
 * PUT /api/encounters/:id
 * Update an encounter
 */
app.put('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const encounterId = c.req.param('id');

  if (!isValidUuid(encounterId)) {
    throw new ValidationError('Invalid encounter ID');
  }

  const body = await c.req.json();
  const validated = EncounterUpdateSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  // Validate all friend IDs if provided
  if (validated.friend_ids) {
    for (const friendId of validated.friend_ids) {
      if (!isValidUuid(friendId)) {
        throw new ValidationError(`Invalid friend ID: ${friendId}`);
      }
    }
  }

  const encountersService = new EncountersService(db);
  const encounter = await encountersService.updateEncounter(user.userId, encounterId, validated);

  if (!encounter) {
    throw new EncounterNotFoundError();
  }

  return c.json(encounter);
});

/**
 * DELETE /api/encounters/:id
 * Delete an encounter
 */
app.delete('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const encounterId = c.req.param('id');

  if (!isValidUuid(encounterId)) {
    throw new ValidationError('Invalid encounter ID');
  }

  const encountersService = new EncountersService(db);
  const deleted = await encountersService.deleteEncounter(user.userId, encounterId);

  if (!deleted) {
    throw new EncounterNotFoundError();
  }

  return c.json({ success: true });
});

export default app;
