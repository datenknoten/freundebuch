import type { EmailInput, EmailResponse } from '@freundebuch/shared/index.js';
import {
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  getEmailsByFriendId,
  type IDeleteEmailResult,
  type IGetEmailsByFriendIdResult,
  updateEmail,
} from '../../../models/queries/friend-emails.queries.js';
import { parseEmailType } from '../../../utils/parse-email-type.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

const mapRow = (row: IGetEmailsByFriendIdResult): EmailResponse => ({
  id: row.external_id,
  emailAddress: row.email_address,
  emailType: parseEmailType(row.email_type),
  label: row.label ?? undefined,
  isPrimary: row.is_primary,
  createdAt: row.created_at.toISOString(),
});

/**
 * EmailService handles all email-related operations for friends.
 * Extends SubResourceService for common CRUD operations.
 */
export class EmailService extends SubResourceService<
  EmailInput,
  EmailResponse,
  IGetEmailsByFriendIdResult,
  IGetEmailsByFriendIdResult,
  IDeleteEmailResult
> {
  constructor(options: SubResourceServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'email',
        hasPrimaryFlag: true,

        createFn: async ({ userExternalId, ownerExternalId: friendExternalId, input }, client) => {
          return createEmail.run(
            {
              userExternalId,
              friendExternalId,
              emailAddress: input.email_address,
              emailType: input.email_type,
              label: input.label ?? null,
              isPrimary: input.is_primary,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId, input },
          client,
        ) => {
          return updateEmail.run(
            {
              userExternalId,
              friendExternalId,
              emailExternalId: resourceExternalId,
              emailAddress: input.email_address,
              emailType: input.email_type,
              label: input.label ?? null,
              isPrimary: input.is_primary,
            },
            client,
          );
        },

        deleteFn: async (
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId },
          client,
        ) => {
          return deleteEmail.run(
            {
              userExternalId,
              friendExternalId,
              emailExternalId: resourceExternalId,
            },
            client,
          );
        },

        clearPrimaryFn: async ({ userExternalId, ownerExternalId: friendExternalId }, client) => {
          return clearPrimaryEmail.run({ userExternalId, friendExternalId }, client);
        },

        isPrimary: (input) => input.is_primary,

        setIsPrimary: (input, isPrimary) => ({ ...input, is_primary: isPrimary }),

        listFn: async ({ userExternalId, ownerExternalId: friendExternalId }, client) => {
          return getEmailsByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
