// Generated from one config by createSubResourceRouter.
import { PhoneInputSchema } from '@freundebuch/shared/index.js';
import { AddressService, PhoneService } from '../../../services/friends/index.js';
import { normalizePhoneBody } from '../../../services/phone-normalization.js';
import { FriendNotFoundError } from '../../../utils/errors.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

/**
 * Country for interpreting a national-format number: the friend's primary
 * address. Loads only the addresses, not the whole friend.
 */
const friendPrimaryCountry = async (
  c: Parameters<Parameters<typeof normalizePhoneBody>[0]>[0],
  userId: string,
  friendId: string,
): Promise<string | null | undefined> => {
  const addresses = await new AddressService({
    db: c.get('db'),
    logger: c.get('logger'),
  }).list(userId, friendId);
  return (addresses.find((address) => address.isPrimary) ?? addresses[0])?.country;
};

export default createSubResourceRouter({
  ownerParam: 'id',
  ownerLabel: 'friend ID',
  resourceParam: 'phoneId',
  resourceLabel: 'Phone',
  schema: PhoneInputSchema,
  ownerNotFound: () => new FriendNotFoundError(),
  service: (c) => new PhoneService({ db: c.get('db'), logger: c.get('logger') }),
  preprocess: normalizePhoneBody(friendPrimaryCountry),
});
