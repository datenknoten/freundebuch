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

function mapRow(row: IGetPhonesByCollectiveIdResult) {
  return {
    id: row.external_id,
    phoneNumber: row.phone_number,
    phoneType: parsePhoneType(row.phone_type),
    label: row.label ?? undefined,
    isPrimary: row.is_primary,
    createdAt: row.created_at.toISOString(),
  } satisfies PhoneResponse;
}

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

        async createFn({ userExternalId, ownerExternalId: collectiveExternalId, data }, client) {
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

        async updateFn(
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, data },
          client,
        ) {
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

        async deleteFn(
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId },
          client,
        ) {
          return deletePhone.run(
            {
              userExternalId,
              collectiveExternalId,
              phoneExternalId: resourceExternalId,
            },
            client,
          );
        },

        async clearPrimaryFn({ userExternalId, ownerExternalId: collectiveExternalId }, client) {
          return clearPrimaryPhone.run({ userExternalId, collectiveExternalId }, client);
        },

        isPrimary(data) {
          return data.isPrimary;
        },

        setIsPrimary(data, isPrimary) {
          return { ...data, isPrimary };
        },

        async listFn({ userExternalId, ownerExternalId: collectiveExternalId }, client) {
          return getPhonesByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
