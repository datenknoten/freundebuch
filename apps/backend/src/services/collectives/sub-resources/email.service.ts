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

const mapRow = (row: IGetEmailsByCollectiveIdResult): EmailResponse => ({
  id: row.external_id,
  emailAddress: row.email_address,
  emailType: parseEmailType(row.email_type),
  label: row.label ?? undefined,
  isPrimary: row.is_primary,
  createdAt: row.created_at.toISOString(),
});

/**
 * EmailService handles all email-related operations for collectives.
 * Extends SubResourceService for common CRUD operations.
 */
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

        createFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, data },
          client,
        ) => {
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

        updateFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, data },
          client,
        ) => {
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

        deleteFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId },
          client,
        ) => {
          return deleteEmail.run(
            {
              userExternalId,
              collectiveExternalId,
              emailExternalId: resourceExternalId,
            },
            client,
          );
        },

        clearPrimaryFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId },
          client,
        ) => {
          return clearPrimaryEmail.run({ userExternalId, collectiveExternalId }, client);
        },

        isPrimary: (data) => data.isPrimary,

        setIsPrimary: (data, isPrimary) => ({ ...data, isPrimary }),

        listFn: async ({ userExternalId, ownerExternalId: collectiveExternalId }, client) => {
          return getEmailsByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
