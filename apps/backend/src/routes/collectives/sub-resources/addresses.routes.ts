// Generated from one config by createSubResourceRouter.
import { AddressInputSchema } from '@freundebuch/shared/index.js';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
import { getAddressLookupService } from '../../../services/address-lookup.registry.js';
import { CollectiveAddressService } from '../../../services/collectives/index.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'collective ID',
  resourceParam: 'addressId',
  resourceLabel: 'Address',
  schema: AddressInputSchema,
  ownerNotFound: CollectiveNotFoundError,
  service: (c) => {
    const db = c.get('db');
    const logger = c.get('logger');
    return new CollectiveAddressService({
      db,
      logger,
      addressLookupService: getAddressLookupService(db, logger, c.get('config')),
    });
  },
});
