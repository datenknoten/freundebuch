// Generated from one config by createSubResourceRouter.
import { AddressInputSchema } from '@freundebuch/shared/index.js';
import type { CollectiveAddressService } from '../../../services/collectives/sub-resources/address.service.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapAddressInput } from '../../mappers/map-address-input.js';

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
    mapInput: mapAddressInput,
    service: options.collectiveAddressService,
  });
}
