import type { Email, EmailInput } from '@freundebuch/shared/index.js';
import {
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  getEmailsByCollectiveId,
  type IDeleteEmailResult,
  type IGetEmailsByCollectiveIdResult,
  updateEmail,
} from '../../../models/queries/collective-emails.queries.js';
import { parseEmailType } from '../../../utils/type-guards.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

/**
 * EmailService handles all email-related operations for collectives.
 * Extends SubResourceService for common CRUD operations.
 */
export class CollectiveEmailService extends SubResourceService<
  EmailInput,
  Email,
  IGetEmailsByCollectiveIdResult,
  IGetEmailsByCollectiveIdResult,
  IDeleteEmailResult
> {
  constructor(options: SubResourceServiceOptions) {
    super(options, {
      resourceName: 'collective email',
      hasPrimaryFlag: true,

      listFn: async ({ userExternalId, ownerExternalId: collectiveExternalId }, client) => {
        return getEmailsByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
      },

      mapListResult: (row): Email => ({
        id: row.external_id,
        emailAddress: row.email_address,
        emailType: parseEmailType(row.email_type),
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),

      createFn: async (
        { userExternalId, ownerExternalId: collectiveExternalId, input },
        client,
      ) => {
        return createEmail.run(
          {
            userExternalId,
            collectiveExternalId,
            emailAddress: input.email_address,
            emailType: input.email_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      updateFn: async (
        { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, input },
        client,
      ) => {
        return updateEmail.run(
          {
            userExternalId,
            collectiveExternalId,
            emailExternalId: resourceExternalId,
            emailAddress: input.email_address,
            emailType: input.email_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
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

      clearPrimaryFn: async ({ userExternalId, ownerExternalId: collectiveExternalId }, client) => {
        return clearPrimaryEmail.run({ userExternalId, collectiveExternalId }, client);
      },

      isPrimary: (input) => input.is_primary ?? false,

      setIsPrimary: (input, value) => ({ ...input, is_primary: value }),

      mapResult: (row): Email => ({
        id: row.external_id,
        emailAddress: row.email_address,
        emailType: parseEmailType(row.email_type),
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
