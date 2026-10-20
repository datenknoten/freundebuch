// Generated from one config by createSubResourceRouter.
import { DateInputSchema } from '@freundebuch/shared/index.js';
import type { DateService } from '../../../services/friends/sub-resources/date.service.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapDateInput } from '../../mappers/map-date-input.js';

export interface DatesRoutesOptions {
  dateService: DateService;
}

export function createDatesRoutes(options: DatesRoutesOptions) {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'dateId',
    resourceLabel: 'Date',
    schema: DateInputSchema,
    mapInput: mapDateInput,
    service: options.dateService,
  });
}
