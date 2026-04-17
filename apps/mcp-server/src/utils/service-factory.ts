import { AppPasswordsService } from '@freundebuch/backend/services/app-passwords.service.js';
import { CirclesService } from '@freundebuch/backend/services/circles.service.js';
import { CollectivesService } from '@freundebuch/backend/services/collectives/collectives.service.js';
import { EncountersService } from '@freundebuch/backend/services/encounters.service.js';
import { FriendsService } from '@freundebuch/backend/services/friends/friends.service.js';
import type pg from 'pg';
import type { Logger } from 'pino';

export function createServices(pool: pg.Pool, logger: Logger) {
  return {
    friends: new FriendsService(pool, logger),
    circles: new CirclesService(pool),
    collectives: new CollectivesService(pool),
    encounters: new EncountersService(pool),
    appPasswords: new AppPasswordsService(pool, logger),
  };
}

export type Services = ReturnType<typeof createServices>;
