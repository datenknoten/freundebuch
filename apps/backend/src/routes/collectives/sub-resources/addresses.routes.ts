// Generated from one config by createSubResourceRouter.
import { AddressInputSchema } from '@freundebuch/shared/index.js';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
import type { CollectiveAddressService } from '../../../services/collectives/sub-resources/address.service.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export interface CollectiveAddressesRoutesOptions {
  collectiveAddressService: CollectiveAddressService;
}

export function createCollectiveAddressesRoutes(options: CollectiveAddressesRoutesOptions) {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'collective ID',
    resourceParam: 'addressId',
    resourceLabel: 'Address',
    schema: AddressInputSchema,
    ownerNotFound: CollectiveNotFoundError,
    service: options.collectiveAddressService,
  });
}
