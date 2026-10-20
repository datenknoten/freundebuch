import type { EmailResponse } from '@freundebuch/shared/index.js';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
import {
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  getEmailsByCollectiveId,
  type IDeleteEmailResult,
  type IGetEmailsByCollectiveIdResult,
  updateEmail,
} from '../../../models/queries/collective-emails.queries.js';
import { parseEmailType } from '../../../utils/parse-email-type.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';
import type { EmailData } from '../../friends/sub-resources/email.service.js';

function mapRow(row: IGetEmailsByCollectiveIdResult) {
  return {
    id: row.external_id,
    emailAddress: row.email_address,
    emailType: parseEmailType(row.email_type),
    label: row.label ?? undefined,
    isPrimary: row.is_primary,
    createdAt: row.created_at.toISOString(),
  } satisfies EmailResponse;
}

export class CollectiveEmailService extends SubResourceService<
  EmailData,
  EmailResponse,
  IGetEmailsByCollectiveIdResult,
  IGetEmailsByCollectiveIdResult,
  IDeleteEmailResult
> {
  constructor(options: SubResourceServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'collective email',
        resourceLabel: 'Email',
        ownerNotFound: CollectiveNotFoundError,
        hasPrimaryFlag: true,

        async createFn({ userExternalId, ownerExternalId: collectiveExternalId, data }, client) {
          return createEmail.run(
            {
              userExternalId,
              collectiveExternalId,
              emailAddress: data.emailAddress,
              emailType: data.emailType,
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
          return updateEmail.run(
            {
              userExternalId,
              collectiveExternalId,
              emailExternalId: resourceExternalId,
              emailAddress: data.emailAddress,
              emailType: data.emailType,
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
          return deleteEmail.run(
            {
              userExternalId,
              collectiveExternalId,
              emailExternalId: resourceExternalId,
            },
            client,
          );
        },

        async clearPrimaryFn({ userExternalId, ownerExternalId: collectiveExternalId }, client) {
          return clearPrimaryEmail.run({ userExternalId, collectiveExternalId }, client);
        },

        isPrimary(data) {
          return data.isPrimary;
        },

        setIsPrimary(data, isPrimary) {
          return { ...data, isPrimary };
        },

        async listFn({ userExternalId, ownerExternalId: collectiveExternalId }, client) {
          return getEmailsByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
