import type { Email, EmailInput, EmailType } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  type IDeleteEmailResult,
  type IGetEmailsByFriendIdResult,
  updateEmail,
} from '../../../models/queries/friend-emails.queries.js';
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
          client as pg.Pool,
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
          client as pg.Pool,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deleteEmail.run(
          {
            userExternalId,
            friendExternalId,
            emailExternalId: resourceExternalId,
          },
          client as pg.Pool,
        );
      },

      clearPrimaryFn: async ({ userExternalId, friendExternalId }, client) => {
        return clearPrimaryEmail.run({ userExternalId, friendExternalId }, client as pg.Pool);
      },

      isPrimary: (input) => input.is_primary ?? false,

      mapResult: (row): Email => ({
        id: row.external_id,
        emailAddress: row.email_address,
        emailType: row.email_type as EmailType,
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
