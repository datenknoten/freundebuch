import type { PhoneResponse } from '@freundebuch/shared/index.js';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
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
import type { PhoneData } from '../../friends/sub-resources/phone.service.js';

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
  PhoneData,
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
        resourceLabel: 'Phone',
        ownerNotFound: CollectiveNotFoundError,
        hasPrimaryFlag: true,

        createFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, data },
          client,
        ) => {
          return createPhone.run(
            {
              userExternalId,
              collectiveExternalId,
              phoneNumber: data.phoneNumber,
              phoneType: data.phoneType,
              label: data.label ?? null,
              isPrimary: data.isPrimary,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, data },
          client,
        ) => {
          return updatePhone.run(
            {
              userExternalId,
              collectiveExternalId,
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

        isPrimary: (data) => data.isPrimary,

        setIsPrimary: (data, isPrimary) => ({ ...data, isPrimary }),

        listFn: async ({ userExternalId, ownerExternalId: collectiveExternalId }, client) => {
          return getPhonesByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
