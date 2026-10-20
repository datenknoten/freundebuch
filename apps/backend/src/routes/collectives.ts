import { ValidationError } from '@datenknoten/kit';
import {
  type CollectiveCreateInput,
  CollectiveCreateInputSchema,
  CollectiveListQuerySchema,
  type CollectiveUpdateInput,
  CollectiveUpdateInputSchema,
  type MembershipCreateInput,
  MembershipCreateInputSchema,
  type MembershipDeactivateInput,
  MembershipDeactivateInputSchema,
  MembershipUpdateInputSchema,
  parseCollectiveListQuery,
  type RelationshipPreviewInput,
  RelationshipPreviewInputSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono, type MiddlewareHandler } from 'hono';
import { getAuthUser } from '../middleware/auth.js';
import type { CollectiveTypesService } from '../services/collectives/collective-types.service.js';
import type {
  CollectiveCreateData,
  CollectivesService,
  CollectiveUpdateData,
} from '../services/collectives/collectives.service.js';
import type {
  MembershipCreateData,
  MembershipDeactivateData,
  MembershipsService,
  RelationshipPreviewData,
} from '../services/collectives/memberships.service.js';
import type { CollectiveAddressService } from '../services/collectives/sub-resources/address.service.js';
import type { CollectiveCircleService } from '../services/collectives/sub-resources/circle.service.js';
import type { CollectiveEmailService } from '../services/collectives/sub-resources/email.service.js';
import type { CollectivePhoneService } from '../services/collectives/sub-resources/phone.service.js';
import type { CollectiveUrlService } from '../services/collectives/sub-resources/url.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

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

function mapCollectiveCreateInput(input: CollectiveCreateInput) {
  return {
    name: input.name,
    collectiveTypeId: input.collective_type_id,
    notes: input.notes,
    photoUrl: input.photo_url,
    photoThumbnailUrl: input.photo_thumbnail_url,
    addressStreetLine1: input.address_street_line1,
    addressStreetLine2: input.address_street_line2,
    addressCity: input.address_city,
    addressStateProvince: input.address_state_province,
    addressPostalCode: input.address_postal_code,
    addressCountry: input.address_country,
  } satisfies CollectiveCreateData;
}

// Only present keys are copied: the service treats an absent key as "leave untouched".
function mapCollectiveUpdateInput(input: CollectiveUpdateInput) {
  const data: CollectiveUpdateData = {};
  if ('name' in input) {
    data.name = input.name;
  }
  if ('notes' in input) {
    data.notes = input.notes;
  }
  if ('photo_url' in input) {
    data.photoUrl = input.photo_url;
  }
  if ('photo_thumbnail_url' in input) {
    data.photoThumbnailUrl = input.photo_thumbnail_url;
  }
  if ('address_street_line1' in input) {
    data.addressStreetLine1 = input.address_street_line1;
  }
  if ('address_street_line2' in input) {
    data.addressStreetLine2 = input.address_street_line2;
  }
  if ('address_city' in input) {
    data.addressCity = input.address_city;
  }
  if ('address_state_province' in input) {
    data.addressStateProvince = input.address_state_province;
  }
  if ('address_postal_code' in input) {
    data.addressPostalCode = input.address_postal_code;
  }
  if ('address_country' in input) {
    data.addressCountry = input.address_country;
  }
  return data;
}

function mapMembershipCreateInput(input: MembershipCreateInput) {
  return {
    friendId: input.friend_id,
    roleId: input.role_id,
    joinedDate: input.joined_date,
    notes: input.notes,
    shouldSkipAutoRelationships: input.skip_auto_relationships,
  } satisfies MembershipCreateData;
}

function mapMembershipDeactivateInput(input: MembershipDeactivateInput) {
  return {
    reason: input.reason,
    inactiveDate: input.inactive_date,
  } satisfies MembershipDeactivateData;
}

function mapRelationshipPreviewInput(input: RelationshipPreviewInput) {
  return { friendId: input.friend_id, roleId: input.role_id } satisfies RelationshipPreviewData;
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

  app.use('*', authMiddleware);
  app.use('*', rateLimitMiddleware);
  app.use('*', onboardingMiddleware);

  //#region Collective types

  app.get('/types', async (c) => {
    const user = getAuthUser(c);
    const result = await collectiveTypesService.listTypes(user.userId);
    return c.json(result);
  });

  // Includes roles and rules
  app.get('/types/:id', async (c) => {
    const user = getAuthUser(c);
    const typeId = requireUuidParam(c, 'id', 'type ID');
    const collectiveType = await collectiveTypesService.getType(user.userId, typeId);

    return c.json(collectiveType);
  });

  //#endregion

  //#region Collective CRUD

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

  app.post('/', async (c) => {
    const user = getAuthUser(c);

    const validated = await parseBody(c, CollectiveCreateInputSchema);
    const collective = await collectivesService.createCollective(
      user.userId,
      mapCollectiveCreateInput(validated),
    );

    return c.json(collective, 201);
  });

  // Includes all members
  app.get('/:id', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const collective = await collectivesService.getCollective(user.userId, collectiveId);

    return c.json(collective);
  });

  app.put('/:id', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const validated = await parseBody(c, CollectiveUpdateInputSchema);
    const collective = await collectivesService.updateCollective(
      user.userId,
      collectiveId,
      mapCollectiveUpdateInput(validated),
    );

    return c.json(collective);
  });

  // Soft delete
  app.delete('/:id', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    await collectivesService.deleteCollective(user.userId, collectiveId);

    return c.json({ success: true });
  });

  //#endregion

  //#region Memberships

  // Previews the relationships that adding a member would create
  app.post('/:id/members/preview', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const validated = await parseBody(c, RelationshipPreviewInputSchema);
    const preview = await membershipsService.previewRelationships(
      user.userId,
      collectiveId,
      mapRelationshipPreviewInput(validated),
    );

    return c.json(preview);
  });

  app.post('/:id/members', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const validated = await parseBody(c, MembershipCreateInputSchema);
    const member = await membershipsService.addMember(
      user.userId,
      collectiveId,
      mapMembershipCreateInput(validated),
    );

    return c.json(member, 201);
  });

  app.delete('/:id/members/:memberId', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const memberId = requireUuidParam(c, 'memberId', 'member ID');
    await membershipsService.removeMember(user.userId, collectiveId, memberId);

    return c.json({ success: true });
  });

  app.put('/:id/members/:memberId/role', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const memberId = requireUuidParam(c, 'memberId', 'member ID');
    const validated = await parseBody(c, MembershipUpdateInputSchema);

    if (validated.role_id === undefined) {
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

  app.post('/:id/members/:memberId/deactivate', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const memberId = requireUuidParam(c, 'memberId', 'member ID');
    const validated = await parseBody(c, MembershipDeactivateInputSchema);
    const member = await membershipsService.deactivateMember(
      user.userId,
      collectiveId,
      memberId,
      mapMembershipDeactivateInput(validated),
    );

    return c.json(member);
  });

  app.post('/:id/members/:memberId/reactivate', async (c) => {
    const user = getAuthUser(c);
    const collectiveId = requireUuidParam(c, 'id', 'collective ID');
    const memberId = requireUuidParam(c, 'memberId', 'member ID');
    const member = await membershipsService.reactivateMember(user.userId, collectiveId, memberId);

    return c.json(member);
  });

  //#endregion

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
