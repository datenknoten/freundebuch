// Generated from one config by createSubResourceRouter.
import { SocialProfileInputSchema } from '@freundebuch/shared/index.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import { SocialProfileService } from '../../../services/friends/index.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'friend ID',
  resourceParam: 'profileId',
  resourceLabel: 'Social profile',
  schema: SocialProfileInputSchema,
  ownerNotFound: FriendNotFoundError,
  service: (c) => new SocialProfileService({ db: c.get('db'), logger: c.get('logger') }),
});
