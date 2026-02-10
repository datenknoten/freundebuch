import {
  CollectiveInputSchema,
  CollectiveListQuerySchema,
  CollectiveUpdateSchema,
  type ErrorResponse,
  MembershipDeactivateSchema,
  MembershipInputSchema,
  MembershipUpdateSchema,
  parseCollectiveListQuery,
  RelationshipPreviewRequestSchema,
} from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { collectivesRateLimitMiddleware } from '../middleware/rate-limit.js';
import {
  CollectivesService,
  CollectiveTypesService,
  MembershipsService,
} from '../services/collectives/index.js';
import type { AppContext } from '../types/context.js';
import { isAppError, toError } from '../utils/errors.js';
import { isValidUuid } from '../utils/security.js';

// Sub-resource routes
import {
  addressesRoutes,
  circlesRoutes,
  emailsRoutes,
  phonesRoutes,
  urlsRoutes,
} from './collectives/sub-resources/index.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all collective routes
app.use('*', authMiddleware);
// Apply rate limiting to prevent abuse
app.use('*', collectivesRateLimitMiddleware);
// Apply onboarding middleware to require self-friend before using collectives
app.use('*', onboardingMiddleware);

// ============================================================================
// Collective Types Routes
// ============================================================================

/**
 * GET /api/collectives/types
 * List all collective types available to the user
 */
app.get('/types', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const typesService = new CollectiveTypesService(db);
    const result = await typesService.listTypes(user.userId);
    return c.json(result);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list collective types');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to list collective types');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list collective types' }, 500);
  }
});

/**
 * GET /api/collectives/types/:id
 * Get a single collective type with roles and rules
 */
app.get('/types/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const typeId = c.req.param('id');

  if (!isValidUuid(typeId)) {
    return c.json<ErrorResponse>({ error: 'Invalid type ID' }, 400);
  }

  try {
    const typesService = new CollectiveTypesService(db);
    const collectiveType = await typesService.getTypeById(user.userId, typeId);

    if (!collectiveType) {
      return c.json<ErrorResponse>({ error: 'Collective type not found' }, 404);
    }

    return c.json(collectiveType);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get collective type');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, typeId }, 'Failed to get collective type');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get collective type' }, 500);
  }
});

// ============================================================================
// Collective CRUD Routes
// ============================================================================

/**
 * GET /api/collectives
 * List all collectives for the authenticated user with pagination and filtering
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const query = c.req.query();
    const validated = CollectiveListQuerySchema(query);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
    }

    const options = parseCollectiveListQuery(validated);

    // Validate type_id if provided
    if (options.typeId && !isValidUuid(options.typeId)) {
      return c.json<ErrorResponse>({ error: 'Invalid type_id' }, 400);
    }

    const collectivesService = new CollectivesService(db);
    const result = await collectivesService.listCollectives(user.userId, options);

    return c.json(result);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list collectives');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to list collectives');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list collectives' }, 500);
  }
});

/**
 * POST /api/collectives
 * Create a new collective
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);

  try {
    const body = await c.req.json();
    const validated = CollectiveInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    // Validate collective_type_id
    if (!isValidUuid(validated.collective_type_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid collective_type_id' }, 400);
    }

    const collectivesService = new CollectivesService(db);
    const collective = await collectivesService.createCollective(user.userId, validated);

    return c.json(collective, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to create collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err }, 'Failed to create collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to create collective' }, 500);
  }
});

/**
 * GET /api/collectives/:id
 * Get a single collective by ID with all members
 */
app.get('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const collectivesService = new CollectivesService(db);
    const collective = await collectivesService.getCollectiveById(user.userId, collectiveId);

    if (!collective) {
      return c.json<ErrorResponse>({ error: 'Collective not found' }, 404);
    }

    return c.json(collective);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to get collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to get collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to get collective' }, 500);
  }
});

/**
 * PUT /api/collectives/:id
 * Update a collective
 */
app.put('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const validated = CollectiveUpdateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    const collectivesService = new CollectivesService(db);
    const collective = await collectivesService.updateCollective(
      user.userId,
      collectiveId,
      validated,
    );

    return c.json(collective);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to update collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update collective' }, 500);
  }
});

/**
 * DELETE /api/collectives/:id
 * Soft delete a collective
 */
app.delete('/:id', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const collectivesService = new CollectivesService(db);
    const deleted = await collectivesService.deleteCollective(user.userId, collectiveId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Collective not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to delete collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to delete collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete collective' }, 500);
  }
});

// ============================================================================
// Membership Routes
// ============================================================================

/**
 * POST /api/collectives/:id/members/preview
 * Preview relationships that would be created when adding a member
 */
app.post('/:id/members/preview', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const validated = RelationshipPreviewRequestSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    // Validate IDs
    if (!isValidUuid(validated.friend_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid friend_id' }, 400);
    }
    if (!isValidUuid(validated.role_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid role_id' }, 400);
    }

    const membershipsService = new MembershipsService(db);
    const preview = await membershipsService.previewRelationships(
      user.userId,
      collectiveId,
      validated,
    );

    return c.json(preview);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to preview relationships');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to preview relationships');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to preview relationships' }, 500);
  }
});

/**
 * POST /api/collectives/:id/members
 * Add a member to a collective
 */
app.post('/:id/members', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const validated = MembershipInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    // Validate IDs
    if (!isValidUuid(validated.friend_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid friend_id' }, 400);
    }
    if (!isValidUuid(validated.role_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid role_id' }, 400);
    }

    const membershipsService = new MembershipsService(db);
    const member = await membershipsService.addMember(user.userId, collectiveId, validated);

    return c.json(member, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to add member');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to add member');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add member' }, 500);
  }
});

/**
 * DELETE /api/collectives/:id/members/:memberId
 * Remove a member from a collective
 */
app.delete('/:id/members/:memberId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }
  if (!isValidUuid(memberId)) {
    return c.json<ErrorResponse>({ error: 'Invalid member ID' }, 400);
  }

  try {
    const membershipsService = new MembershipsService(db);
    const deleted = await membershipsService.removeMember(user.userId, collectiveId, memberId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'Member not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to remove member');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId, memberId }, 'Failed to remove member');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to remove member' }, 500);
  }
});

/**
 * PUT /api/collectives/:id/members/:memberId/role
 * Change a member's role
 */
app.put('/:id/members/:memberId/role', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }
  if (!isValidUuid(memberId)) {
    return c.json<ErrorResponse>({ error: 'Invalid member ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const validated = MembershipUpdateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    if (!validated.role_id) {
      return c.json<ErrorResponse>({ error: 'role_id is required' }, 400);
    }
    if (!isValidUuid(validated.role_id)) {
      return c.json<ErrorResponse>({ error: 'Invalid role_id' }, 400);
    }

    const membershipsService = new MembershipsService(db);
    const member = await membershipsService.updateMemberRole(
      user.userId,
      collectiveId,
      memberId,
      validated.role_id,
    );

    return c.json(member);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update member role');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId, memberId }, 'Failed to update member role');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update member role' }, 500);
  }
});

/**
 * POST /api/collectives/:id/members/:memberId/deactivate
 * Deactivate a member
 */
app.post('/:id/members/:memberId/deactivate', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }
  if (!isValidUuid(memberId)) {
    return c.json<ErrorResponse>({ error: 'Invalid member ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const validated = MembershipDeactivateSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid input', details: validated }, 400);
    }

    const membershipsService = new MembershipsService(db);
    const member = await membershipsService.deactivateMember(
      user.userId,
      collectiveId,
      memberId,
      validated,
    );

    return c.json(member);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to deactivate member');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId, memberId }, 'Failed to deactivate member');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to deactivate member' }, 500);
  }
});

/**
 * POST /api/collectives/:id/members/:memberId/reactivate
 * Reactivate a member
 */
app.post('/:id/members/:memberId/reactivate', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidUuid(collectiveId)) {
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }
  if (!isValidUuid(memberId)) {
    return c.json<ErrorResponse>({ error: 'Invalid member ID' }, 400);
  }

  try {
    const membershipsService = new MembershipsService(db);
    const member = await membershipsService.reactivateMember(user.userId, collectiveId, memberId);

    return c.json(member);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to reactivate member');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }

    const err = toError(error);
    logger.error({ err, collectiveId, memberId }, 'Failed to reactivate member');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to reactivate member' }, 500);
  }
});

// ============================================================================
// Sub-resource Routes
// ============================================================================

// Mount sub-resource routes under /:id/
app.route('/:id/phones', phonesRoutes);
app.route('/:id/emails', emailsRoutes);
app.route('/:id/addresses', addressesRoutes);
app.route('/:id/urls', urlsRoutes);
app.route('/:id/circles', circlesRoutes);

export default app;
