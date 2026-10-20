// Generated from one config by createSubResourceRouter.
import { UrlInputSchema } from '@freundebuch/shared/index.js';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
import { CollectiveUrlService } from '../../../services/collectives/index.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'collective ID',
  resourceParam: 'urlId',
  resourceLabel: 'Url',
  schema: UrlInputSchema,
  ownerNotFound: CollectiveNotFoundError,
  service: (c) => new CollectiveUrlService({ db: c.get('db'), logger: c.get('logger') }),
});
