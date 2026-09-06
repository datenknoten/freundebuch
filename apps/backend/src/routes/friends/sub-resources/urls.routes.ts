// Generated from one config by createSubResourceRouter.
import { UrlInputSchema } from '@freundebuch/shared/index.js';
import { UrlService } from '../../../services/friends/index.js';
import { FriendNotFoundError } from '../../../utils/errors.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'friend ID',
  resourceParam: 'urlId',
  resourceLabel: 'Url',
  schema: UrlInputSchema,
  ownerNotFound: () => new FriendNotFoundError(),
  service: (c) => new UrlService({ db: c.get('db'), logger: c.get('logger') }),
});
