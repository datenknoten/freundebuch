// Generated from one config by createSubResourceRouter.
import { EmailInputSchema } from '@freundebuch/shared/index.js';
import type { EmailService } from '../../../services/friends/sub-resources/email.service.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapEmailInput } from '../../mappers/map-email-input.js';

export interface EmailsRoutesOptions {
  emailService: EmailService;
}

export function createEmailsRoutes(options: EmailsRoutesOptions) {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'emailId',
    resourceLabel: 'Email',
    schema: EmailInputSchema,
    mapInput: mapEmailInput,
    service: options.emailService,
  });
}
