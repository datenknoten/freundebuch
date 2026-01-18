import type { Phone, PhoneInput, PhoneType } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  clearPrimaryPhone,
  createPhone,
  deletePhone,
  type IDeletePhoneResult,
  type IGetPhonesByFriendIdResult,
  updatePhone,
} from '../../../models/queries/friend-phones.queries.js';
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
          client as pg.Pool,
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
          client as pg.Pool,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deletePhone.run(
          {
            userExternalId,
            friendExternalId,
            phoneExternalId: resourceExternalId,
          },
          client as pg.Pool,
        );
      },

      clearPrimaryFn: async ({ userExternalId, friendExternalId }, client) => {
        return clearPrimaryPhone.run({ userExternalId, friendExternalId }, client as pg.Pool);
      },

      isPrimary: (input) => input.is_primary ?? false,

      mapResult: (row): Phone => ({
        id: row.external_id,
        phoneNumber: row.phone_number,
        phoneType: row.phone_type as PhoneType,
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
