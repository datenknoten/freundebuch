import { ValidationError } from '@datenknoten/kit';
import {
  EncounterCreateInputSchema,
  EncounterListQuerySchema,
  EncounterUpdateInputSchema,
  parseEncounterListQuery,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono, type MiddlewareHandler } from 'hono';
import { EncounterNotFoundError } from '../errors/encounter-not-found.error.js';
import { getAuthUser } from '../middleware/auth.js';
import type { EncountersService } from '../services/encounters.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

export interface EncountersRoutesOptions {
  encountersService: EncountersService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createEncountersRoutes(options: EncountersRoutesOptions) {
  const { encountersService, authMiddleware, onboardingMiddleware, rateLimitMiddleware } = options;
  const app = new Hono<AppContext>();

  // Apply auth middleware to all encounter routes
  app.use('*', authMiddleware);
  // Apply rate limiting to prevent abuse
  app.use('*', rateLimitMiddleware);
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

  /**
   * POST /api/encounters
   * Create a new encounter
   */
  app.post('/', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, EncounterCreateInputSchema);
    const encounter = await encountersService.createEncounter(user.userId, validated);

    return c.json(encounter, 201);
  });

  /**
   * GET /api/encounters/:id
   * Get a single encounter by ID
   */
  app.get('/:id', async (c) => {
    const user = getAuthUser(c);
    const encounterId = requireUuidParam(c, 'id', 'encounter ID');
    const encounter = await encountersService.getEncounterById(user.userId, encounterId);

    if (!encounter) {
      throw new EncounterNotFoundError(encounterId);
    }

    return c.json(encounter);
  });

  /**
   * PUT /api/encounters/:id
   * Update an encounter
   */
  app.put('/:id', async (c) => {
    const user = getAuthUser(c);
    const encounterId = requireUuidParam(c, 'id', 'encounter ID');
    const validated = await parseBody(c, EncounterUpdateInputSchema);
    const encounter = await encountersService.updateEncounter(user.userId, encounterId, validated);

    if (!encounter) {
      throw new EncounterNotFoundError(encounterId);
    }

    return c.json(encounter);
  });

  /**
   * DELETE /api/encounters/:id
   * Delete an encounter
   */
  app.delete('/:id', async (c) => {
    const user = getAuthUser(c);
    const encounterId = requireUuidParam(c, 'id', 'encounter ID');
    const isDeleted = await encountersService.deleteEncounter(user.userId, encounterId);

    if (!isDeleted) {
      throw new EncounterNotFoundError(encounterId);
    }

    return c.json({ success: true });
  });

  return app;
}
