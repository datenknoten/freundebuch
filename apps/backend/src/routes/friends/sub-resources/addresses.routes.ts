// Generated from one config by createSubResourceRouter.
import { AddressInputSchema } from '@freundebuch/shared/index.js';
import { getAddressLookupService } from '../../../services/address-lookup.registry.js';
import { AddressService } from '../../../services/friends/index.js';
import { FriendNotFoundError } from '../../../utils/errors.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'friend ID',
  resourceParam: 'addressId',
  resourceLabel: 'Address',
  schema: AddressInputSchema,
  ownerNotFound: () => new FriendNotFoundError(),
  service: (c) => {
    const db = c.get('db');
    const logger = c.get('logger');
    return new AddressService({
      db,
      logger,
      addressLookupService: getAddressLookupService(db, logger),
    });
  },
});
