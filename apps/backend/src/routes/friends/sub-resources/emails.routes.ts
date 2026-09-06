// Generated from one config by createSubResourceRouter.
import { EmailInputSchema } from '@freundebuch/shared/index.js';
import { EmailService } from '../../../services/friends/index.js';
import { FriendNotFoundError } from '../../../utils/errors.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'friend ID',
  resourceParam: 'emailId',
  resourceLabel: 'Email',
  schema: EmailInputSchema,
  ownerNotFound: () => new FriendNotFoundError(),
  service: (c) => new EmailService({ db: c.get('db'), logger: c.get('logger') }),
});
