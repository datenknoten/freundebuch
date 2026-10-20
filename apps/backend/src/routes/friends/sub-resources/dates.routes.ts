// Generated from one config by createSubResourceRouter.
import { DateInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import type { DateService } from '../../../services/friends/sub-resources/date.service.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export interface DatesRoutesOptions {
  dateService: DateService;
}

export function createDatesRoutes(options: DatesRoutesOptions): Hono<AppContext> {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'dateId',
    resourceLabel: 'Date',
    schema: DateInputSchema,
    ownerNotFound: FriendNotFoundError,
    service: options.dateService,
  });
}
