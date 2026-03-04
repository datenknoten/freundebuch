import type { Address, AddressInput } from '@freundebuch/shared/index.js';
import {
  clearPrimaryAddress,
  createAddress,
  deleteAddress,
  getAddressesByFriendId,
  type IDeleteAddressResult,
  type IGetAddressesByFriendIdResult,
  updateAddress,
} from '../../../models/queries/friend-addresses.queries.js';
import { parseAddressType } from '../../../utils/type-guards.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../base/sub-resource.service.js';

/**
 * AddressService handles all address-related operations for friends.
 * Extends SubResourceService for common CRUD operations.
 */
export class AddressService extends SubResourceService<
  AddressInput,
  Address,
  IGetAddressesByFriendIdResult,
  IGetAddressesByFriendIdResult,
  IDeleteAddressResult
> {
  constructor(options: SubResourceServiceOptions) {
    super(options, {
      resourceName: 'address',
      hasPrimaryFlag: true,

      createFn: async ({ userExternalId, friendExternalId, input }, client) => {
        return createAddress.run(
          {
            userExternalId,
            friendExternalId,
            streetLine1: input.street_line1 ?? null,
            streetLine2: input.street_line2 ?? null,
            city: input.city ?? null,
            stateProvince: input.state_province ?? null,
            postalCode: input.postal_code ?? null,
            country: input.country ?? null,
            addressType: input.address_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      updateFn: async ({ userExternalId, friendExternalId, resourceExternalId, input }, client) => {
        return updateAddress.run(
          {
            userExternalId,
            friendExternalId,
            addressExternalId: resourceExternalId,
            streetLine1: input.street_line1 ?? null,
            streetLine2: input.street_line2 ?? null,
            city: input.city ?? null,
            stateProvince: input.state_province ?? null,
            postalCode: input.postal_code ?? null,
            country: input.country ?? null,
            addressType: input.address_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deleteAddress.run(
          {
            userExternalId,
            friendExternalId,
            addressExternalId: resourceExternalId,
          },
          client,
        );
      },

      clearPrimaryFn: async ({ userExternalId, friendExternalId }, client) => {
        return clearPrimaryAddress.run({ userExternalId, friendExternalId }, client);
      },

      countFn: async ({ userExternalId, friendExternalId }, client) => {
        return getAddressesByFriendId.run({ userExternalId, friendExternalId }, client);
      },

      isPrimary: (input) => input.is_primary ?? false,

      setIsPrimary: (input, value) => ({ ...input, is_primary: value }),

      mapResult: (row): Address => ({
        id: row.external_id,
        streetLine1: row.street_line1 ?? undefined,
        streetLine2: row.street_line2 ?? undefined,
        city: row.city ?? undefined,
        stateProvince: row.state_province ?? undefined,
        postalCode: row.postal_code ?? undefined,
        country: row.country ?? undefined,
        addressType: parseAddressType(row.address_type),
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
