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

  return {
    // No address lookup here: the MCP tools never geocode new addresses.
    friends: new FriendsService({
      db,
      logger,
      photoService: new PhotoService({ logger, config: photoConfig }),
      searchService: new SearchService({ db, logger }),
      relationshipService: new RelationshipService({ db, logger }),
      networkGraphService: new NetworkGraphService({ db, logger }),
      phoneService: new PhoneService({ db, logger }),
      emailService: new EmailService({ db, logger }),
      addressService: new AddressService({ db, logger }),
      urlService: new UrlService({ db, logger }),
      dateService: new DateService({ db, logger }),
      socialProfileService: new SocialProfileService({ db, logger }),
      professionalHistoryService: new ProfessionalHistoryService({ db, logger }),
      metInfoService: new MetInfoService({ db, logger }),
    }),
    circles: new CirclesService({ db }),
    collectives: new CollectivesService({ db }),
    encounters: new EncountersService({ db }),
    friendNotes: new FriendNotesService({ db, logger }),
    appPasswords: new AppPasswordsService({ db, logger }),
  } satisfies Services;
}
