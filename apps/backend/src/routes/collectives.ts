import { ValidationError } from '@datenknoten/kit';
import {
  CollectiveCreateInputSchema,
  CollectiveListQuerySchema,
  CollectiveUpdateInputSchema,
  MembershipCreateInputSchema,
  MembershipDeactivateInputSchema,
  MembershipUpdateInputSchema,
  parseCollectiveListQuery,
  RelationshipPreviewInputSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono, type MiddlewareHandler } from 'hono';
import { CollectiveNotFoundError } from '../errors/collective-not-found.error.js';
import { MembershipNotFoundError } from '../errors/membership-not-found.error.js';
import { ResourceNotFoundError } from '../errors/resource-not-found.error.js';
import { getAuthUser } from '../middleware/auth.js';
import type { CollectiveTypesService } from '../services/collectives/collective-types.service.js';
import type { CollectivesService } from '../services/collectives/collectives.service.js';
import type { MembershipsService } from '../services/collectives/memberships.service.js';
import type { CollectiveAddressService } from '../services/collectives/sub-resources/address.service.js';
import type { CollectiveCircleService } from '../services/collectives/sub-resources/circle.service.js';
import type { CollectiveEmailService } from '../services/collectives/sub-resources/email.service.js';
import type { CollectivePhoneService } from '../services/collectives/sub-resources/phone.service.js';
import type { CollectiveUrlService } from '../services/collectives/sub-resources/url.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

// Sub-resource routes
import { createCollectiveAddressesRoutes } from './collectives/sub-resources/addresses.routes.js';
import { createCollectiveCirclesRoutes } from './collectives/sub-resources/circles.routes.js';
import { createCollectiveEmailsRoutes } from './collectives/sub-resources/emails.routes.js';
import { createCollectivePhonesRoutes } from './collectives/sub-resources/phones.routes.js';
import { createCollectiveUrlsRoutes } from './collectives/sub-resources/urls.routes.js';

export interface CollectivesRoutesOptions {
  collectivesService: CollectivesService;
  collectiveTypesService: CollectiveTypesService;
  membershipsService: MembershipsService;
  collectiveAddressService: CollectiveAddressService;
  collectiveCircleService: CollectiveCircleService;
  collectiveEmailService: CollectiveEmailService;
  collectivePhoneService: CollectivePhoneService;
  collectiveUrlService: CollectiveUrlService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createCollectivesRoutes(options: CollectivesRoutesOptions) {
  const {
    collectivesService,
    collectiveTypesService,
    membershipsService,
    collectiveAddressService,
    collectiveCircleService,
    collectiveEmailService,
    collectivePhoneService,
    collectiveUrlService,
    authMiddleware,
    onboardingMiddleware,
    rateLimitMiddleware,
  } = options;
  const app = new Hono<AppContext>();

  // Apply auth middleware to all collective routes
  app.use('*', authMiddleware);
  // Apply rate limiting to prevent abuse
  app.use('*', rateLimitMiddleware);
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
    const user = getAuthUser(c);
    const result = await collectiveTypesService.listTypes(user.userId);
    return c.json(result);
  });

  /**
   * GET /api/collectives/types/:id
   * Get a single collective type with roles and rules
   */
  app.get('/types/:id', async (c) => {
    const user = getAuthUser(c);
    const typeId = requireUuidParam(c, 'id', 'type ID');
    const collectiveType = await collectiveTypesService.getTypeById(user.userId, typeId);

    if (!collectiveType) {
      throw new ResourceNotFoundError('Collective type', typeId);
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
    const user = getAuthUser(c);

    const query = c.req.query();
    const validated = CollectiveListQuerySchema(query);

    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    const listOptions = parseCollectiveListQuery(validated);
    const result = await collectivesService.listCollectives(user.userId, listOptions);

    return c.json(result);
  });

  /**
   * POST /api/collectives
   * Create a new collective
   */
  app.post('/', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, CollectiveCreateInputSchema);
    const collective = await collectivesService.createCollective(user.userId, validated);

    return c.json(collective, 201);
  });

  /**
   * GET /api/collectives/:id
   * Get a single collective by ID with all members
   */
  app.get('/:id', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const collective = await collectivesService.getCollectiveById(user.userId, collectiveId);

    if (!collective) {
      throw new CollectiveNotFoundError(collectiveId);
    }

    return c.json(collective);
  });

  /**
   * PUT /api/collectives/:id
   * Update a collective
   */
  app.put('/:id', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const validated = await parseBody(c, CollectiveUpdateInputSchema);
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
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const isDeleted = await collectivesService.deleteCollective(user.userId, collectiveId);

    if (!isDeleted) {
      throw new CollectiveNotFoundError(collectiveId);
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
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const validated = await parseBody(c, RelationshipPreviewInputSchema);
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
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const validated = await parseBody(c, MembershipCreateInputSchema);
    const member = await membershipsService.addMember(user.userId, collectiveId, validated);

    return c.json(member, 201);
  });

  /**
   * DELETE /api/collectives/:id/members/:memberId
   * Remove a member from a collective
   */
  app.delete('/:id/members/:memberId', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const memberId = requireUuidParam(c, 'memberId', 'member ID');
    const isDeleted = await membershipsService.removeMember(user.userId, collectiveId, memberId);

    if (!isDeleted) {
      throw new MembershipNotFoundError(memberId);
    }

    return c.json({ success: true });
  });

  /**
   * PUT /api/collectives/:id/members/:memberId/role
   * Change a member's role
   */
  app.put('/:id/members/:memberId/role', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const memberId = requireUuidParam(c, 'memberId', 'member ID');
    const validated = await parseBody(c, MembershipUpdateInputSchema);

    if (!validated.role_id) {
      throw new ValidationError('role_id is required');
    }
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
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const memberId = requireUuidParam(c, 'memberId', 'member ID');
    const validated = await parseBody(c, MembershipDeactivateInputSchema);
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
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const memberId = requireUuidParam(c, 'memberId', 'member ID');
    const member = await membershipsService.reactivateMember(user.userId, collectiveId, memberId);

    return c.json(member);
  });

  // ============================================================================
  // Sub-resource Routes
  // ============================================================================

  // Mount sub-resource routes under /:id/
  app.route(
    '/:id/phones',
    createCollectivePhonesRoutes({ collectivePhoneService, collectiveAddressService }),
  );
  app.route('/:id/emails', createCollectiveEmailsRoutes({ collectiveEmailService }));
  app.route('/:id/addresses', createCollectiveAddressesRoutes({ collectiveAddressService }));
  app.route('/:id/urls', createCollectiveUrlsRoutes({ collectiveUrlService }));
  app.route('/:id/circles', createCollectiveCirclesRoutes({ collectiveCircleService }));

  return app;
}
