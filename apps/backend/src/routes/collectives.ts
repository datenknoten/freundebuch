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
import { CollectiveNotFoundError, ValidationError } from '../utils/errors.js';
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
  const db = c.get('db');
  const user = getAuthUser(c);

  const typesService = new CollectiveTypesService(db);
  const result = await typesService.listTypes(user.userId);
  return c.json(result);
});

/**
 * GET /api/collectives/types/:id
 * Get a single collective type with roles and rules
 */
app.get('/types/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const typeId = c.req.param('id');

  if (!isValidUuid(typeId)) {
    throw new ValidationError('Invalid type ID');
  }

  const typesService = new CollectiveTypesService(db);
  const collectiveType = await typesService.getTypeById(user.userId, typeId);

  if (!collectiveType) {
    return c.json<ErrorResponse>({ error: 'Collective type not found' }, 404);
  }

  return c.json(collectiveType);
});

// ============================================================================
// Collective CRUD Routes
// ============================================================================

/**
 * GET /api/collectives
 * List all collectives for the authenticated user with pagination and filtering
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);

  const query = c.req.query();
  const validated = CollectiveListQuerySchema(query);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  const options = parseCollectiveListQuery(validated);

  // Validate type_id if provided
  if (options.typeId && !isValidUuid(options.typeId)) {
    throw new ValidationError('Invalid type_id');
  }

  const collectivesService = new CollectivesService(db);
  const result = await collectivesService.listCollectives(user.userId, options);

  return c.json(result);
});

/**
 * POST /api/collectives
 * Create a new collective
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);

  const body = await c.req.json();
  const validated = CollectiveInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  // Validate collective_type_id
  if (!isValidUuid(validated.collective_type_id)) {
    throw new ValidationError('Invalid collective_type_id');
  }

  const collectivesService = new CollectivesService(db);
  const collective = await collectivesService.createCollective(user.userId, validated);

  return c.json(collective, 201);
});

/**
 * GET /api/collectives/:id
 * Get a single collective by ID with all members
 */
app.get('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const collectivesService = new CollectivesService(db);
  const collective = await collectivesService.getCollectiveById(user.userId, collectiveId);

  if (!collective) {
    throw new CollectiveNotFoundError();
  }

  return c.json(collective);
});

/**
 * PUT /api/collectives/:id
 * Update a collective
 */
app.put('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const body = await c.req.json();
  const validated = CollectiveUpdateSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  const collectivesService = new CollectivesService(db);
  const collective = await collectivesService.updateCollective(
    user.userId,
    collectiveId,
    validated,
  );

  return c.json(collective);
});

/**
 * DELETE /api/collectives/:id
 * Soft delete a collective
 */
app.delete('/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const collectivesService = new CollectivesService(db);
  const deleted = await collectivesService.deleteCollective(user.userId, collectiveId);

  if (!deleted) {
    throw new CollectiveNotFoundError();
  }

  return c.json({ success: true });
});

// ============================================================================
// Membership Routes
// ============================================================================

/**
 * POST /api/collectives/:id/members/preview
 * Preview relationships that would be created when adding a member
 */
app.post('/:id/members/preview', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const body = await c.req.json();
  const validated = RelationshipPreviewRequestSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  // Validate IDs
  if (!isValidUuid(validated.friend_id)) {
    throw new ValidationError('Invalid friend_id');
  }
  if (!isValidUuid(validated.role_id)) {
    throw new ValidationError('Invalid role_id');
  }

  const membershipsService = new MembershipsService(db);
  const preview = await membershipsService.previewRelationships(
    user.userId,
    collectiveId,
    validated,
  );

  return c.json(preview);
});

/**
 * POST /api/collectives/:id/members
 * Add a member to a collective
 */
app.post('/:id/members', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  const body = await c.req.json();
  const validated = MembershipInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  // Validate IDs
  if (!isValidUuid(validated.friend_id)) {
    throw new ValidationError('Invalid friend_id');
  }
  if (!isValidUuid(validated.role_id)) {
    throw new ValidationError('Invalid role_id');
  }

  const membershipsService = new MembershipsService(db);
  const member = await membershipsService.addMember(user.userId, collectiveId, validated);

  return c.json(member, 201);
});

/**
 * DELETE /api/collectives/:id/members/:memberId
 * Remove a member from a collective
 */
app.delete('/:id/members/:memberId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }
  if (!isValidUuid(memberId)) {
    throw new ValidationError('Invalid member ID');
  }

  const membershipsService = new MembershipsService(db);
  const deleted = await membershipsService.removeMember(user.userId, collectiveId, memberId);

  if (!deleted) {
    return c.json<ErrorResponse>({ error: 'Member not found' }, 404);
  }

  return c.json({ success: true });
});

/**
 * PUT /api/collectives/:id/members/:memberId/role
 * Change a member's role
 */
app.put('/:id/members/:memberId/role', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }
  if (!isValidUuid(memberId)) {
    throw new ValidationError('Invalid member ID');
  }

  const body = await c.req.json();
  const validated = MembershipUpdateSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  if (!validated.role_id) {
    throw new ValidationError('role_id is required');
  }
  if (!isValidUuid(validated.role_id)) {
    throw new ValidationError('Invalid role_id');
  }

  const membershipsService = new MembershipsService(db);
  const member = await membershipsService.updateMemberRole(
    user.userId,
    collectiveId,
    memberId,
    validated.role_id,
  );

  return c.json(member);
});

/**
 * POST /api/collectives/:id/members/:memberId/deactivate
 * Deactivate a member
 */
app.post('/:id/members/:memberId/deactivate', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }
  if (!isValidUuid(memberId)) {
    throw new ValidationError('Invalid member ID');
  }

  const body = await c.req.json();
  const validated = MembershipDeactivateSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid input', validated);
  }

  const membershipsService = new MembershipsService(db);
  const member = await membershipsService.deactivateMember(
    user.userId,
    collectiveId,
    memberId,
    validated,
  );

  return c.json(member);
});

/**
 * POST /api/collectives/:id/members/:memberId/reactivate
 * Reactivate a member
 */
app.post('/:id/members/:memberId/reactivate', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }
  if (!isValidUuid(memberId)) {
    throw new ValidationError('Invalid member ID');
  }

  const membershipsService = new MembershipsService(db);
  const member = await membershipsService.reactivateMember(user.userId, collectiveId, memberId);

  return c.json(member);
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
