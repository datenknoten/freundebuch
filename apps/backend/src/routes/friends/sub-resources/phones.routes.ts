// Generated from one config by createSubResourceRouter.
import { PhoneInputSchema } from '@freundebuch/shared/index.js';
import type { AddressService } from '../../../services/friends/sub-resources/address.service.js';
import type { PhoneService } from '../../../services/friends/sub-resources/phone.service.js';
import { normalizePhoneBody } from '../../../services/phone-normalization.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapPhoneInput } from '../../mappers/map-phone-input.js';

export interface PhonesRoutesOptions {
  phoneService: PhoneService;
  addressService: AddressService;
}

export function createPhonesRoutes(options: PhonesRoutesOptions) {
  /**
   * Country for interpreting a national-format number: the friend's primary
   * address. Loads only the addresses, not the whole friend.
   */
  async function friendPrimaryCountry(userId: string, friendId: string) {
    const addresses = await options.addressService.list(userId, friendId);
    return (addresses.find((address) => address.isPrimary === true) ?? addresses[0])?.country;
  }

  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'phoneId',
    resourceLabel: 'Phone',
    schema: PhoneInputSchema,
    mapInput: mapPhoneInput,
    service: options.phoneService,
    preprocess: normalizePhoneBody(friendPrimaryCountry),
  });
}
