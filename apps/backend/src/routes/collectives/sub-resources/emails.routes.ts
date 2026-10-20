// Generated from one config by createSubResourceRouter.
import { EmailInputSchema } from '@freundebuch/shared/index.js';
import type { CollectiveEmailService } from '../../../services/collectives/sub-resources/email.service.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapEmailInput } from '../../mappers/map-email-input.js';

export interface CollectiveEmailsRoutesOptions {
  collectiveEmailService: CollectiveEmailService;
}

export function createCollectiveEmailsRoutes(options: CollectiveEmailsRoutesOptions) {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'collective ID',
    resourceParam: 'emailId',
    resourceLabel: 'Email',
    schema: EmailInputSchema,
    mapInput: mapEmailInput,
    service: options.collectiveEmailService,
  });
}
