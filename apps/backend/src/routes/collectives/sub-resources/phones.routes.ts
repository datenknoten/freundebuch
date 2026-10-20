// Generated from one config by createSubResourceRouter.
import { PhoneInputSchema } from '@freundebuch/shared/index.js';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
import type { CollectiveAddressService } from '../../../services/collectives/sub-resources/address.service.js';
import type { CollectivePhoneService } from '../../../services/collectives/sub-resources/phone.service.js';
import { normalizePhoneBody } from '../../../services/phone-normalization.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export interface CollectivePhonesRoutesOptions {
  collectivePhoneService: CollectivePhoneService;
  collectiveAddressService: CollectiveAddressService;
}

export function createCollectivePhonesRoutes(options: CollectivePhonesRoutesOptions) {
  const { collectivePhoneService, collectiveAddressService } = options;

  const collectivePrimaryCountry = async (
    userId: string,
    collectiveId: string,
  ): Promise<string | null | undefined> => {
    const addresses = await collectiveAddressService.list(userId, collectiveId);
    return (addresses.find((address) => address.isPrimary) ?? addresses[0])?.country;
  };

  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'collective ID',
    resourceParam: 'phoneId',
    resourceLabel: 'Phone',
    schema: PhoneInputSchema,
    ownerNotFound: CollectiveNotFoundError,
    service: collectivePhoneService,
    preprocess: normalizePhoneBody(collectivePrimaryCountry),
  });
}
