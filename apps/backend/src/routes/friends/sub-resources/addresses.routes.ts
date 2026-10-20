// Generated from one config by createSubResourceRouter.
import { AddressInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import type { AddressService } from '../../../services/friends/sub-resources/address.service.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

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
    ownerNotFound: FriendNotFoundError,
    service: options.addressService,
  });
}
