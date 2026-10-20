import { Hono, type MiddlewareHandler } from 'hono';
import type { CirclesService } from '../../services/circles.service.js';
import type { CollectivesService } from '../../services/collectives/collectives.service.js';
import type { EncountersService } from '../../services/encounters.service.js';
import type { FriendsService } from '../../services/friends/friends.service.js';
import type { AddressService } from '../../services/friends/sub-resources/address.service.js';
import type { DateService } from '../../services/friends/sub-resources/date.service.js';
import type { EmailService } from '../../services/friends/sub-resources/email.service.js';
import type { FriendNotesService } from '../../services/friends/sub-resources/friend-notes.service.js';
import type { PhoneService } from '../../services/friends/sub-resources/phone.service.js';
import type { ProfessionalHistoryService } from '../../services/friends/sub-resources/professional-history.service.js';
import type { SocialProfileService } from '../../services/friends/sub-resources/social-profile.service.js';
import type { UrlService } from '../../services/friends/sub-resources/url.service.js';
import type { PhotoService } from '../../services/photo.service.js';
import type { AppContext } from '../../types/context.js';
import { createCoreRoutes } from './core.routes.js';
import { createDashboardRoutes } from './dashboard.routes.js';
import { createOrganizationRoutes } from './organization.routes.js';
import { createSearchRoutes } from './search.routes.js';
import { createAddressesRoutes } from './sub-resources/addresses.routes.js';
import { createCollectivesRoutes } from './sub-resources/collectives.routes.js';
import { createDatesRoutes } from './sub-resources/dates.routes.js';
import { createEmailsRoutes } from './sub-resources/emails.routes.js';
import { createEncountersRoutes } from './sub-resources/encounters.routes.js';
import { createMetInfoRoutes } from './sub-resources/met-info.routes.js';
import { createNotesRoutes } from './sub-resources/notes.routes.js';
import { createPhonesRoutes } from './sub-resources/phones.routes.js';
import { createProfessionalHistoryRoutes } from './sub-resources/professional-history.routes.js';
import { createRelationshipsRoutes } from './sub-resources/relationships.routes.js';
import { createSocialProfilesRoutes } from './sub-resources/social-profiles.routes.js';
import { createUrlsRoutes } from './sub-resources/urls.routes.js';

export interface FriendsRoutesOptions {
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
  friendsService: FriendsService;
  photoService: PhotoService;
  circlesService: CirclesService;
  phoneService: PhoneService;
  emailService: EmailService;
  addressService: AddressService;
  urlService: UrlService;
  dateService: DateService;
  socialProfileService: SocialProfileService;
  professionalHistoryService: ProfessionalHistoryService;
  friendNotesService: FriendNotesService;
  encountersService: EncountersService;
  collectivesService: CollectivesService;
}

export function createFriendsRoutes(options: FriendsRoutesOptions): Hono<AppContext> {
  const app = new Hono<AppContext>();

  // Apply auth middleware to all friend routes
  app.use('*', options.authMiddleware);
  // Apply onboarding middleware to require self-friend before using friends
  app.use('*', options.onboardingMiddleware);
  // Apply rate limiting to all friend routes
  app.use('*', options.rateLimitMiddleware);

  // Dashboard routes (must be before /:id to avoid being caught by wildcard)
  app.route('/', createDashboardRoutes(options));

  // Search routes (must be before /:id to avoid being caught by wildcard)
  app.route('/search', createSearchRoutes(options));

  // Core friend CRUD routes
  app.route('/', createCoreRoutes(options));

  // Organization routes (photos, circles, favorites, archive)
  app.route('/', createOrganizationRoutes(options));

  // Sub-resource routes - mounted under /:id
  app.route('/:id/phones', createPhonesRoutes(options));
  app.route('/:id/emails', createEmailsRoutes(options));
  app.route('/:id/addresses', createAddressesRoutes(options));
  app.route('/:id/urls', createUrlsRoutes(options));
  app.route('/:id/dates', createDatesRoutes(options));
  app.route('/:id/met-info', createMetInfoRoutes(options));
  app.route('/:id/social-profiles', createSocialProfilesRoutes(options));
  app.route('/:id/relationships', createRelationshipsRoutes(options));
  app.route('/:id/professional-history', createProfessionalHistoryRoutes(options));
  app.route('/:id/encounters', createEncountersRoutes(options));
  app.route('/:id/collectives', createCollectivesRoutes(options));
  app.route('/:id/notes', createNotesRoutes(options));

  return app;
}
