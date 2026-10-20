// Generated from one config by createSubResourceRouter.
import { PhoneInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import type { AddressService } from '../../../services/friends/sub-resources/address.service.js';
import type { PhoneService } from '../../../services/friends/sub-resources/phone.service.js';
import { normalizePhoneBody } from '../../../services/phone-normalization.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export interface PhonesRoutesOptions {
  phoneService: PhoneService;
  addressService: AddressService;
}

export function createPhonesRoutes(options: PhonesRoutesOptions): Hono<AppContext> {
  /**
   * Country for interpreting a national-format number: the friend's primary
   * address. Loads only the addresses, not the whole friend.
   */
  async function friendPrimaryCountry(
    userId: string,
    friendId: string,
  ): Promise<string | null | undefined> {
    const addresses = await options.addressService.list(userId, friendId);
    return (addresses.find((address) => address.isPrimary) ?? addresses[0])?.country;
  }

  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'phoneId',
    resourceLabel: 'Phone',
    schema: PhoneInputSchema,
    ownerNotFound: FriendNotFoundError,
    service: options.phoneService,
    preprocess: normalizePhoneBody(friendPrimaryCountry),
  });
}
