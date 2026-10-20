import type pg from 'pg';
import type { Logger } from 'pino';
import type { Config } from './config.js';
import type { Auth } from './lib/auth.js';
import { AddressLookupService } from './services/address-lookup.service.js';
import { AppPasswordsService } from './services/app-passwords.service.js';
import { CirclesService } from './services/circles.service.js';
import { CollectiveTypesService } from './services/collectives/collective-types.service.js';
import { CollectivesService } from './services/collectives/collectives.service.js';
import { MembershipsService } from './services/collectives/memberships.service.js';
import { CollectiveAddressService } from './services/collectives/sub-resources/address.service.js';
import { CollectiveCircleService } from './services/collectives/sub-resources/circle.service.js';
import { CollectiveEmailService } from './services/collectives/sub-resources/email.service.js';
import { CollectivePhoneService } from './services/collectives/sub-resources/phone.service.js';
import { CollectiveUrlService } from './services/collectives/sub-resources/url.service.js';
import { EncountersService } from './services/encounters.service.js';
import { NominatimClient } from './services/external/nominatim.client.js';
import { OverpassClient } from './services/external/overpass.client.js';
import { PostGISAddressClient } from './services/external/postgis-address.client.js';
import { FriendsService } from './services/friends/friends.service.js';
import { NetworkGraphService } from './services/friends/network-graph.service.js';
import { RelationshipService } from './services/friends/relationship.service.js';
import { SearchService } from './services/friends/search.service.js';
import { AddressService } from './services/friends/sub-resources/address.service.js';
import { DateService } from './services/friends/sub-resources/date.service.js';
import { EmailService } from './services/friends/sub-resources/email.service.js';
import { FriendNotesService } from './services/friends/sub-resources/friend-notes.service.js';
import { MetInfoService } from './services/friends/sub-resources/met-info.service.js';
import { PhoneService } from './services/friends/sub-resources/phone.service.js';
import { ProfessionalHistoryService } from './services/friends/sub-resources/professional-history.service.js';
import { SocialProfileService } from './services/friends/sub-resources/social-profile.service.js';
import { UrlService } from './services/friends/sub-resources/url.service.js';
import { NotificationChannelsService } from './services/notification-channels.service.js';
import { OAuthClientsService } from './services/oauth-clients.service.js';
import { PhotoService } from './services/photo.service.js';
import { ReadinessService } from './services/readiness.service.js';
import { UsersService } from './services/users.service.js';
import { createHouseNumbersCache, createStreetsCache } from './utils/cache.js';
import { deriveCredentialsKey } from './utils/derive-credentials-key.js';

export interface ServicesOptions {
  config: Config;
  logger: Logger;
  pool: pg.Pool;
  /** The search_path=auth pool behind `auth`; the readiness probe checks it too. */
  authPool: pg.Pool;
  auth: Auth;
}

/** Every service of the app, keyed the way route factory options name them. */
export interface Services {
  auth: Auth;
  photoService: PhotoService;
  addressLookupService: AddressLookupService;
  searchService: SearchService;
  relationshipService: RelationshipService;
  networkGraphService: NetworkGraphService;
  phoneService: PhoneService;
  emailService: EmailService;
  addressService: AddressService;
  urlService: UrlService;
  dateService: DateService;
  socialProfileService: SocialProfileService;
  professionalHistoryService: ProfessionalHistoryService;
  metInfoService: MetInfoService;
  friendNotesService: FriendNotesService;
  friendsService: FriendsService;
  usersService: UsersService;
  circlesService: CirclesService;
  encountersService: EncountersService;
  collectivesService: CollectivesService;
  collectiveTypesService: CollectiveTypesService;
  membershipsService: MembershipsService;
  collectiveAddressService: CollectiveAddressService;
  collectiveCircleService: CollectiveCircleService;
  collectiveEmailService: CollectiveEmailService;
  collectivePhoneService: CollectivePhoneService;
  collectiveUrlService: CollectiveUrlService;
  appPasswordsService: AppPasswordsService;
  notificationChannelsService: NotificationChannelsService;
  readinessService: ReadinessService;
  oauthClientsService: OAuthClientsService;
}

function createAddressLookupService(options: ServicesOptions) {
  const { config, logger, pool } = options;
  const addressLogger = logger.child({ module: 'address-lookup' });

  return new AddressLookupService({
    logger: addressLogger,
    overpassClient: new OverpassClient({
      primaryUrl: config.OVERPASS_API_URL,
      fallbackUrl: config.OVERPASS_FALLBACK_URL,
      logger: addressLogger,
      streetCache: createStreetsCache({ db: pool, logger }),
      houseNumberCache: createHouseNumbersCache({ db: pool, logger }),
    }),
    nominatimClient: new NominatimClient({
      logger: addressLogger,
      contactEmail: config.NOMINATIM_CONTACT_EMAIL,
    }),
    ...(config.POSTGIS_ADDRESS_ENABLED === true
      ? { postgisClient: new PostGISAddressClient({ db: pool, logger: addressLogger }) }
      : {}),
    isPostgisDachOnly: config.POSTGIS_ADDRESS_DACH_ONLY,
  });
}

/**
 * Builds every service once per app. Each service gets the pool, a module
 * child logger and only the config slice it reads.
 */
export function createServices(options: ServicesOptions) {
  const { config, logger, pool: db, authPool, auth } = options;

  const photoService = new PhotoService({ logger: logger.child({ module: 'photos' }), config });
  const addressLookupService = createAddressLookupService(options);

  const friendsLogger = logger.child({ module: 'friends' });
  const searchService = new SearchService({ db, logger: friendsLogger });
  const relationshipService = new RelationshipService({ db, logger: friendsLogger });
  const networkGraphService = new NetworkGraphService({ db, logger: friendsLogger });
  const phoneService = new PhoneService({ db, logger: friendsLogger });
  const emailService = new EmailService({ db, logger: friendsLogger });
  const addressService = new AddressService({ db, logger: friendsLogger, addressLookupService });
  const urlService = new UrlService({ db, logger: friendsLogger });
  const dateService = new DateService({ db, logger: friendsLogger });
  const socialProfileService = new SocialProfileService({ db, logger: friendsLogger });
  const professionalHistoryService = new ProfessionalHistoryService({ db, logger: friendsLogger });
  const metInfoService = new MetInfoService({ db, logger: friendsLogger });
  const friendNotesService = new FriendNotesService({ db, logger: friendsLogger });
  const friendsService = new FriendsService({
    db,
    logger: friendsLogger,
    photoService,
    searchService,
    relationshipService,
    networkGraphService,
    phoneService,
    emailService,
    addressService,
    urlService,
    dateService,
    socialProfileService,
    professionalHistoryService,
    metInfoService,
  });

  const collectivesLogger = logger.child({ module: 'collectives' });

  return {
    auth,
    photoService,
    addressLookupService,
    searchService,
    relationshipService,
    networkGraphService,
    phoneService,
    emailService,
    addressService,
    urlService,
    dateService,
    socialProfileService,
    professionalHistoryService,
    metInfoService,
    friendNotesService,
    friendsService,
    usersService: new UsersService({
      db,
      logger: logger.child({ module: 'users' }),
      friendsService,
      isSignupDisabled: config.DISABLE_SIGNUP,
    }),
    circlesService: new CirclesService({ db }),
    encountersService: new EncountersService({ db }),
    collectivesService: new CollectivesService({ db }),
    collectiveTypesService: new CollectiveTypesService({ db }),
    membershipsService: new MembershipsService({ db }),
    collectiveAddressService: new CollectiveAddressService({
      db,
      logger: collectivesLogger,
      addressLookupService,
    }),
    collectiveCircleService: new CollectiveCircleService({ db, logger: collectivesLogger }),
    collectiveEmailService: new CollectiveEmailService({ db, logger: collectivesLogger }),
    collectivePhoneService: new CollectivePhoneService({ db, logger: collectivesLogger }),
    collectiveUrlService: new CollectiveUrlService({ db, logger: collectivesLogger }),
    appPasswordsService: new AppPasswordsService({
      db,
      logger: logger.child({ module: 'app-passwords' }),
    }),
    notificationChannelsService: new NotificationChannelsService({
      db,
      credentialsKey: deriveCredentialsKey(config.BETTER_AUTH_SECRET),
    }),
    readinessService: new ReadinessService({
      db,
      authDb: authPool,
      logger: logger.child({ module: 'readiness' }),
      config,
    }),
    oauthClientsService: new OAuthClientsService({ db }),
  } satisfies Services;
}
