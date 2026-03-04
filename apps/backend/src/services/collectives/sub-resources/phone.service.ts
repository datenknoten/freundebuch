import type { Phone, PhoneInput } from '@freundebuch/shared/index.js';
import {
  clearPrimaryPhone,
  createPhone,
  deletePhone,
  getPhonesByCollectiveId,
  type IDeletePhoneResult,
  type IGetPhonesByCollectiveIdResult,
  updatePhone,
} from '../../../models/queries/collective-phones.queries.js';
import { parsePhoneType } from '../../../utils/type-guards.js';
import {
  CollectiveSubResourceService,
  type CollectiveSubResourceServiceOptions,
} from './base.service.js';

/**
 * PhoneService handles all phone-related operations for collectives.
 * Extends CollectiveSubResourceService for common CRUD operations.
 */
export class CollectivePhoneService extends CollectiveSubResourceService<
  PhoneInput,
  Phone,
  IGetPhonesByCollectiveIdResult,
  IGetPhonesByCollectiveIdResult,
  IDeletePhoneResult
> {
  constructor(options: CollectiveSubResourceServiceOptions) {
    super(options, {
      resourceName: 'collective phone',
      hasPrimaryFlag: true,

      listFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return getPhonesByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
      },

      mapListResult: (row): Phone => ({
        id: row.external_id,
        phoneNumber: row.phone_number,
        phoneType: parsePhoneType(row.phone_type),
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),

      createFn: async ({ userExternalId, collectiveExternalId, input }, client) => {
        return createPhone.run(
          {
            userExternalId,
            collectiveExternalId,
            phoneNumber: input.phone_number,
            phoneType: input.phone_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      updateFn: async (
        { userExternalId, collectiveExternalId, resourceExternalId, input },
        client,
      ) => {
        return updatePhone.run(
          {
            userExternalId,
            collectiveExternalId,
            phoneExternalId: resourceExternalId,
            phoneNumber: input.phone_number,
            phoneType: input.phone_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      deleteFn: async ({ userExternalId, collectiveExternalId, resourceExternalId }, client) => {
        return deletePhone.run(
          {
            userExternalId,
            collectiveExternalId,
            phoneExternalId: resourceExternalId,
          },
          client,
        );
      },

      clearPrimaryFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return clearPrimaryPhone.run({ userExternalId, collectiveExternalId }, client);
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
