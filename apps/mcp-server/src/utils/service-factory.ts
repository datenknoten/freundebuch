import { AppPasswordsService } from '@freundebuch/backend/services/app-passwords.service.js';
import { CirclesService } from '@freundebuch/backend/services/circles.service.js';
import { CollectivesService } from '@freundebuch/backend/services/collectives/collectives.service.js';
import { EncountersService } from '@freundebuch/backend/services/encounters.service.js';
import { FriendsService } from '@freundebuch/backend/services/friends/friends.service.js';
import { NetworkGraphService } from '@freundebuch/backend/services/friends/network-graph.service.js';
import { RelationshipService } from '@freundebuch/backend/services/friends/relationship.service.js';
import { SearchService } from '@freundebuch/backend/services/friends/search.service.js';
import { AddressService } from '@freundebuch/backend/services/friends/sub-resources/address.service.js';
import { DateService } from '@freundebuch/backend/services/friends/sub-resources/date.service.js';
import { EmailService } from '@freundebuch/backend/services/friends/sub-resources/email.service.js';
import { FriendNotesService } from '@freundebuch/backend/services/friends/sub-resources/friend-notes.service.js';
import { MetInfoService } from '@freundebuch/backend/services/friends/sub-resources/met-info.service.js';
import { PhoneService } from '@freundebuch/backend/services/friends/sub-resources/phone.service.js';
import { ProfessionalHistoryService } from '@freundebuch/backend/services/friends/sub-resources/professional-history.service.js';
import { SocialProfileService } from '@freundebuch/backend/services/friends/sub-resources/social-profile.service.js';
import { UrlService } from '@freundebuch/backend/services/friends/sub-resources/url.service.js';
import { type PhotoConfig, PhotoService } from '@freundebuch/backend/services/photo.service.js';
import type pg from 'pg';
import type { Logger } from 'pino';

export interface ServicesOptions {
  db: pg.Pool;
  logger: Logger;
  photoConfig: PhotoConfig;
}

/** The backend services the MCP tools call. */
export interface Services {
  friends: FriendsService;
  circles: CirclesService;
  collectives: CollectivesService;
  encounters: EncountersService;
  friendNotes: FriendNotesService;
  appPasswords: AppPasswordsService;
}

export function createServices(options: ServicesOptions) {
  const { db, logger, photoConfig } = options;
  const friendsLogger = logger.child({ module: 'friends' });

  return {
    // No address lookup here: the MCP tools never geocode new addresses.
    friends: new FriendsService({
      db,
      logger: friendsLogger,
      photoService: new PhotoService({
        logger: logger.child({ module: 'photos' }),
        config: photoConfig,
      }),
      searchService: new SearchService({ db, logger: friendsLogger }),
      relationshipService: new RelationshipService({ db, logger: friendsLogger }),
      networkGraphService: new NetworkGraphService({ db, logger: friendsLogger }),
      phoneService: new PhoneService({ db, logger: friendsLogger }),
      emailService: new EmailService({ db, logger: friendsLogger }),
      addressService: new AddressService({ db, logger: friendsLogger }),
      urlService: new UrlService({ db, logger: friendsLogger }),
      dateService: new DateService({ db, logger: friendsLogger }),
      socialProfileService: new SocialProfileService({ db, logger: friendsLogger }),
      professionalHistoryService: new ProfessionalHistoryService({ db, logger: friendsLogger }),
      metInfoService: new MetInfoService({ db, logger: friendsLogger }),
    }),
    circles: new CirclesService({ db }),
    collectives: new CollectivesService({ db }),
    encounters: new EncountersService({ db }),
    friendNotes: new FriendNotesService({ db, logger: friendsLogger }),
    appPasswords: new AppPasswordsService({
      db,
      logger: logger.child({ module: 'app-passwords' }),
    }),
  } satisfies Services;
}
