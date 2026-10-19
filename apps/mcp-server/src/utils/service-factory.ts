import { AppPasswordsService } from '@freundebuch/backend/services/app-passwords.service.js';
import { CirclesService } from '@freundebuch/backend/services/circles.service.js';
import { CollectivesService } from '@freundebuch/backend/services/collectives/collectives.service.js';
import { EncountersService } from '@freundebuch/backend/services/encounters.service.js';
import { FriendsService } from '@freundebuch/backend/services/friends/friends.service.js';
import { FriendNotesService } from '@freundebuch/backend/services/friends/sub-resources/friend-notes.service.js';
import type pg from 'pg';
import type { Logger } from 'pino';

export function createServices(pool: pg.Pool, logger: Logger) {
  return {
    friends: new FriendsService({ db: pool, logger: logger }),
    circles: new CirclesService({ db: pool }),
    collectives: new CollectivesService({ db: pool }),
    encounters: new EncountersService({ db: pool }),
    friendNotes: new FriendNotesService({ db: pool, logger: logger }),
    appPasswords: new AppPasswordsService({ db: pool, logger: logger }),
  };
}

export type Services = ReturnType<typeof createServices>;
