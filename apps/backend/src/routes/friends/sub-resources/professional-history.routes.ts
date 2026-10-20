// Generated from one config by createSubResourceRouter.
import { ProfessionalHistoryInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import type { ProfessionalHistoryService } from '../../../services/friends/sub-resources/professional-history.service.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapProfessionalHistoryInput } from '../../mappers/map-professional-history-input.js';

export interface ProfessionalHistoryRoutesOptions {
  professionalHistoryService: ProfessionalHistoryService;
}

export function createProfessionalHistoryRoutes(
  options: ProfessionalHistoryRoutesOptions,
): Hono<AppContext> {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'historyId',
    resourceLabel: 'Professional history entry',
    schema: ProfessionalHistoryInputSchema,
    mapInput: mapProfessionalHistoryInput,
    service: options.professionalHistoryService,
  });
}
