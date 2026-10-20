import type { PhoneResponse, PhoneType } from '@freundebuch/shared/index.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import {
  clearPrimaryPhone,
  createPhone,
  deletePhone,
  getPhonesByFriendId,
  type IDeletePhoneResult,
  type IGetPhonesByFriendIdResult,
  updatePhone,
} from '../../../models/queries/friend-phones.queries.js';
import { parsePhoneType } from '../../../utils/parse-phone-type.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

export interface PhoneData {
  phoneNumber: string;
  phoneType: PhoneType;
  label?: string;
  isPrimary: boolean;
}

const mapRow = (row: IGetPhonesByFriendIdResult): PhoneResponse => ({
  id: row.external_id,
  phoneNumber: row.phone_number,
  phoneType: parsePhoneType(row.phone_type),
  label: row.label ?? undefined,
  isPrimary: row.is_primary,
  createdAt: row.created_at.toISOString(),
});

/**
 * PhoneService handles all phone-related operations for friends.
 * Extends SubResourceService for common CRUD operations.
 */
export class PhoneService extends SubResourceService<
  PhoneData,
  PhoneResponse,
  IGetPhonesByFriendIdResult,
  IGetPhonesByFriendIdResult,
  IDeletePhoneResult
> {
  constructor(options: SubResourceServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'phone',
        resourceLabel: 'Phone',
        ownerNotFound: FriendNotFoundError,
        hasPrimaryFlag: true,

        createFn: async ({ userExternalId, ownerExternalId: friendExternalId, data }, client) => {
          return createPhone.run(
            {
              userExternalId,
              friendExternalId,
              phoneNumber: data.phoneNumber,
              phoneType: data.phoneType,
              label: data.label ?? null,
              isPrimary: data.isPrimary,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId, data },
          client,
        ) => {
          return updatePhone.run(
            {
              userExternalId,
              friendExternalId,
              phoneExternalId: resourceExternalId,
              phoneNumber: data.phoneNumber,
              phoneType: data.phoneType,
              label: data.label ?? null,
              isPrimary: data.isPrimary,
            },
            client,
          );
        },

        deleteFn: async (
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId },
          client,
        ) => {
          return deletePhone.run(
            {
              userExternalId,
              friendExternalId,
              phoneExternalId: resourceExternalId,
            },
            client,
          );
        },

        clearPrimaryFn: async ({ userExternalId, ownerExternalId: friendExternalId }, client) => {
          return clearPrimaryPhone.run({ userExternalId, friendExternalId }, client);
        },

        isPrimary: (data) => data.isPrimary,

        setIsPrimary: (data, isPrimary) => ({ ...data, isPrimary }),

        listFn: async ({ userExternalId, ownerExternalId: friendExternalId }, client) => {
          return getPhonesByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
