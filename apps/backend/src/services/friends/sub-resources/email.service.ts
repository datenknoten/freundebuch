import type { Email, EmailInput } from '@freundebuch/shared/index.js';
import {
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  getEmailsByFriendId,
  type IDeleteEmailResult,
  type IGetEmailsByFriendIdResult,
  updateEmail,
} from '../../../models/queries/friend-emails.queries.js';
import { parseEmailType } from '../../../utils/type-guards.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../base/sub-resource.service.js';

/**
 * EmailService handles all email-related operations for friends.
 * Extends SubResourceService for common CRUD operations.
 */
export class EmailService extends SubResourceService<
  EmailInput,
  Email,
  IGetEmailsByFriendIdResult,
  IGetEmailsByFriendIdResult,
  IDeleteEmailResult
> {
  constructor(options: SubResourceServiceOptions) {
    super(options, {
      resourceName: 'email',
      hasPrimaryFlag: true,

      createFn: async ({ userExternalId, friendExternalId, input }, client) => {
        return createEmail.run(
          {
            userExternalId,
            friendExternalId,
            emailAddress: input.email_address,
            emailType: input.email_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      updateFn: async ({ userExternalId, friendExternalId, resourceExternalId, input }, client) => {
        return updateEmail.run(
          {
            userExternalId,
            friendExternalId,
            emailExternalId: resourceExternalId,
            emailAddress: input.email_address,
            emailType: input.email_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deleteEmail.run(
          {
            userExternalId,
            friendExternalId,
            emailExternalId: resourceExternalId,
          },
          client,
        );
      },

      clearPrimaryFn: async ({ userExternalId, friendExternalId }, client) => {
        return clearPrimaryEmail.run({ userExternalId, friendExternalId }, client);
      },

      countFn: async ({ userExternalId, friendExternalId }, client) => {
        return getEmailsByFriendId.run({ userExternalId, friendExternalId }, client);
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
