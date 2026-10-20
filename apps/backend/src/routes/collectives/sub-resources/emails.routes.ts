// Generated from one config by createSubResourceRouter.
import { EmailInputSchema } from '@freundebuch/shared/index.js';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
import { CollectiveEmailService } from '../../../services/collectives/index.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'collective ID',
  resourceParam: 'emailId',
  resourceLabel: 'Email',
  schema: EmailInputSchema,
  ownerNotFound: CollectiveNotFoundError,
  service: (c) => new CollectiveEmailService({ db: c.get('db'), logger: c.get('logger') }),
});
