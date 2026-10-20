// Generated from one config by createSubResourceRouter.
import { ProfessionalHistoryInputSchema } from '@freundebuch/shared/index.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import { ProfessionalHistoryService } from '../../../services/friends/index.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'friend ID',
  resourceParam: 'historyId',
  resourceLabel: 'Professional history entry',
  schema: ProfessionalHistoryInputSchema,
  ownerNotFound: FriendNotFoundError,
  service: (c) => new ProfessionalHistoryService({ db: c.get('db'), logger: c.get('logger') }),
});
