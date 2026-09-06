// Generated from one config by createSubResourceRouter.
import { PhoneInputSchema } from '@freundebuch/shared/index.js';
import {
  CollectiveAddressService,
  CollectivePhoneService,
} from '../../../services/collectives/index.js';
import { normalizePhoneBody } from '../../../services/phone-normalization.js';
import { CollectiveNotFoundError } from '../../../utils/errors.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

const collectivePrimaryCountry = async (
  c: Parameters<Parameters<typeof normalizePhoneBody>[0]>[0],
  userId: string,
  collectiveId: string,
): Promise<string | null | undefined> => {
  const addresses = await new CollectiveAddressService({
    db: c.get('db'),
    logger: c.get('logger'),
  }).list(userId, collectiveId);
  return (addresses.find((address) => address.isPrimary) ?? addresses[0])?.country;
};

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'collective ID',
  resourceParam: 'phoneId',
  resourceLabel: 'Phone',
  schema: PhoneInputSchema,
  ownerNotFound: () => new CollectiveNotFoundError(),
  service: (c) => new CollectivePhoneService({ db: c.get('db'), logger: c.get('logger') }),
  preprocess: normalizePhoneBody(collectivePrimaryCountry),
});
