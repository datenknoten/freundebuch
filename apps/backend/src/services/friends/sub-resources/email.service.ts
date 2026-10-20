import type { EmailResponse, EmailType } from '@freundebuch/shared/index.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
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

export interface EmailData {
  emailAddress: string;
  emailType: EmailType;
  label?: string;
  isPrimary: boolean;
}

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
  EmailData,
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
        resourceLabel: 'Email',
        ownerNotFound: FriendNotFoundError,
        hasPrimaryFlag: true,

        createFn: async ({ userExternalId, ownerExternalId: friendExternalId, data }, client) => {
          return createEmail.run(
            {
              userExternalId,
              friendExternalId,
              emailAddress: data.emailAddress,
              emailType: data.emailType,
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
          return updateEmail.run(
            {
              userExternalId,
              friendExternalId,
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

        isPrimary: (data) => data.isPrimary,

        setIsPrimary: (data, isPrimary) => ({ ...data, isPrimary }),

        listFn: async ({ userExternalId, ownerExternalId: friendExternalId }, client) => {
          return getEmailsByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
