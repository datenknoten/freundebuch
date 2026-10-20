// Generated from one config by createSubResourceRouter.
import { PhoneInputSchema } from '@freundebuch/shared/index.js';
import type { CollectiveAddressService } from '../../../services/collectives/sub-resources/address.service.js';
import type { CollectivePhoneService } from '../../../services/collectives/sub-resources/phone.service.js';
import { normalizePhoneBody } from '../../../services/phone-normalization.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapPhoneInput } from '../../mappers/map-phone-input.js';

export interface CollectivePhonesRoutesOptions {
  collectivePhoneService: CollectivePhoneService;
  collectiveAddressService: CollectiveAddressService;
}

export function createCollectivePhonesRoutes(options: CollectivePhonesRoutesOptions) {
  const { collectivePhoneService, collectiveAddressService } = options;

  /** Country for interpreting a national-format number: the collective's primary address. */
  async function collectivePrimaryCountry(
    userId: string,
    collectiveId: string,
  ): Promise<string | undefined> {
    const addresses = await collectiveAddressService.list(userId, collectiveId);
    return (addresses.find((address) => address.isPrimary) ?? addresses[0])?.country;
  }

  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'collective ID',
    resourceParam: 'phoneId',
    resourceLabel: 'Phone',
    schema: PhoneInputSchema,
    mapInput: mapPhoneInput,
    service: collectivePhoneService,
    preprocess: normalizePhoneBody(collectivePrimaryCountry),
  });
}
