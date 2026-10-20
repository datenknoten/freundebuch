// Generated from one config by createSubResourceRouter.
import { AddressInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import type { AddressService } from '../../../services/friends/sub-resources/address.service.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapAddressInput } from '../../mappers/map-address-input.js';

export interface AddressesRoutesOptions {
  addressService: AddressService;
}

export function createAddressesRoutes(options: AddressesRoutesOptions): Hono<AppContext> {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'addressId',
    resourceLabel: 'Address',
    schema: AddressInputSchema,
    mapInput: mapAddressInput,
    service: options.addressService,
  });
}
