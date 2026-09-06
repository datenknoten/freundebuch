// Generated from one config by createSubResourceRouter.
import { DateInputSchema } from '@freundebuch/shared/index.js';
import { DateService } from '../../../services/friends/index.js';
import { FriendNotFoundError } from '../../../utils/errors.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'friend ID',
  resourceParam: 'dateId',
  resourceLabel: 'Date',
  schema: DateInputSchema,
  ownerNotFound: () => new FriendNotFoundError(),
  service: (c) => new DateService({ db: c.get('db'), logger: c.get('logger') }),
});
