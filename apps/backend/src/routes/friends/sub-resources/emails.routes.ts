// Generated from one config by createSubResourceRouter.
import { EmailInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import type { EmailService } from '../../../services/friends/sub-resources/email.service.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export interface EmailsRoutesOptions {
  emailService: EmailService;
}

export function createEmailsRoutes(options: EmailsRoutesOptions): Hono<AppContext> {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'emailId',
    resourceLabel: 'Email',
    schema: EmailInputSchema,
    ownerNotFound: FriendNotFoundError,
    service: options.emailService,
  });
}
