import type { Phone, PhoneInput } from '@freundebuch/shared/index.js';
import {
  clearPrimaryPhone,
  createPhone,
  deletePhone,
  getPhonesByFriendId,
  type IDeletePhoneResult,
  type IGetPhonesByFriendIdResult,
  updatePhone,
} from '../../../models/queries/friend-phones.queries.js';
import { parsePhoneType } from '../../../utils/type-guards.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../base/sub-resource.service.js';

/**
 * PhoneService handles all phone-related operations for friends.
 * Extends SubResourceService for common CRUD operations.
 */
export class PhoneService extends SubResourceService<
  PhoneInput,
  Phone,
  IGetPhonesByFriendIdResult,
  IGetPhonesByFriendIdResult,
  IDeletePhoneResult
> {
  constructor(options: SubResourceServiceOptions) {
    super(options, {
      resourceName: 'phone',
      hasPrimaryFlag: true,

      createFn: async ({ userExternalId, friendExternalId, input }, client) => {
        return createPhone.run(
          {
            userExternalId,
            friendExternalId,
            phoneNumber: input.phone_number,
            phoneType: input.phone_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      updateFn: async ({ userExternalId, friendExternalId, resourceExternalId, input }, client) => {
        return updatePhone.run(
          {
            userExternalId,
            friendExternalId,
            phoneExternalId: resourceExternalId,
            phoneNumber: input.phone_number,
            phoneType: input.phone_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deletePhone.run(
          {
            userExternalId,
            friendExternalId,
            phoneExternalId: resourceExternalId,
          },
          client,
        );
      },

      clearPrimaryFn: async ({ userExternalId, friendExternalId }, client) => {
        return clearPrimaryPhone.run({ userExternalId, friendExternalId }, client);
      },

      countFn: async ({ userExternalId, friendExternalId }, client) => {
        return getPhonesByFriendId.run({ userExternalId, friendExternalId }, client);
      },

      isPrimary: (input) => input.is_primary ?? false,

      setIsPrimary: (input, value) => ({ ...input, is_primary: value }),

      mapResult: (row): Phone => ({
        id: row.external_id,
        phoneNumber: row.phone_number,
        phoneType: parsePhoneType(row.phone_type),
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
