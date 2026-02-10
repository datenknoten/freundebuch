import type { Email, EmailInput, EmailType } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  clearPrimaryEmail,
  createEmail,
  deleteEmail,
  getEmailsByCollectiveId,
  type IDeleteEmailResult,
  type IGetEmailsByCollectiveIdResult,
  updateEmail,
} from '../../../models/queries/collective-emails.queries.js';
import {
  CollectiveSubResourceService,
  type CollectiveSubResourceServiceOptions,
} from './base.service.js';

/**
 * EmailService handles all email-related operations for collectives.
 * Extends CollectiveSubResourceService for common CRUD operations.
 */
export class CollectiveEmailService extends CollectiveSubResourceService<
  EmailInput,
  Email,
  IGetEmailsByCollectiveIdResult,
  IGetEmailsByCollectiveIdResult,
  IDeleteEmailResult
> {
  constructor(options: CollectiveSubResourceServiceOptions) {
    super(options, {
      resourceName: 'collective email',
      hasPrimaryFlag: true,

      listFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return getEmailsByCollectiveId.run(
          { userExternalId, collectiveExternalId },
          client as pg.Pool,
        );
      },

      mapListResult: (row): Email => ({
        id: row.external_id,
        emailAddress: row.email_address,
        emailType: row.email_type as EmailType,
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),

      createFn: async ({ userExternalId, collectiveExternalId, input }, client) => {
        return createEmail.run(
          {
            userExternalId,
            collectiveExternalId,
            emailAddress: input.email_address,
            emailType: input.email_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client as pg.Pool,
        );
      },

      updateFn: async (
        { userExternalId, collectiveExternalId, resourceExternalId, input },
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
          client as pg.Pool,
        );
      },

      deleteFn: async ({ userExternalId, collectiveExternalId, resourceExternalId }, client) => {
        return deleteEmail.run(
          {
            userExternalId,
            collectiveExternalId,
            emailExternalId: resourceExternalId,
          },
          client as pg.Pool,
        );
      },

      clearPrimaryFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return clearPrimaryEmail.run({ userExternalId, collectiveExternalId }, client as pg.Pool);
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
