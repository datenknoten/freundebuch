import type { PhoneInput, PhoneResponse } from '@freundebuch/shared/index.js';
import {
  clearPrimaryPhone,
  createPhone,
  deletePhone,
  getPhonesByCollectiveId,
  type IDeletePhoneResult,
  type IGetPhonesByCollectiveIdResult,
  updatePhone,
} from '../../../models/queries/collective-phones.queries.js';
import { parsePhoneType } from '../../../utils/parse-phone-type.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

const mapRow = (row: IGetPhonesByCollectiveIdResult): PhoneResponse => ({
  id: row.external_id,
  phoneNumber: row.phone_number,
  phoneType: parsePhoneType(row.phone_type),
  label: row.label ?? undefined,
  isPrimary: row.is_primary,
  createdAt: row.created_at.toISOString(),
});

/**
 * PhoneService handles all phone-related operations for collectives.
 * Extends SubResourceService for common CRUD operations.
 */
export class CollectivePhoneService extends SubResourceService<
  PhoneInput,
  PhoneResponse,
  IGetPhonesByCollectiveIdResult,
  IGetPhonesByCollectiveIdResult,
  IDeletePhoneResult
> {
  constructor(options: SubResourceServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'collective phone',
        hasPrimaryFlag: true,

        createFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, input },
          client,
        ) => {
          return createPhone.run(
            {
              userExternalId,
              collectiveExternalId,
              phoneNumber: input.phone_number,
              phoneType: input.phone_type,
              label: input.label ?? null,
              isPrimary: input.is_primary,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, input },
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
              isPrimary: input.is_primary,
            },
            client,
          );
        },

        deleteFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId },
          client,
        ) => {
          return deletePhone.run(
            {
              userExternalId,
              collectiveExternalId,
              phoneExternalId: resourceExternalId,
            },
            client,
          );
        },

        clearPrimaryFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId },
          client,
        ) => {
          return clearPrimaryPhone.run({ userExternalId, collectiveExternalId }, client);
        },

        isPrimary: (input) => input.is_primary,

        setIsPrimary: (input, isPrimary) => ({ ...input, is_primary: isPrimary }),

        listFn: async ({ userExternalId, ownerExternalId: collectiveExternalId }, client) => {
          return getPhonesByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
