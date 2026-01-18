import type { ProfessionalHistory, ProfessionalHistoryInput } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  clearPrimaryProfessionalHistory,
  createProfessionalHistory,
  deleteProfessionalHistory,
  type IDeleteProfessionalHistoryResult,
  type IGetProfessionalHistoryByFriendIdResult,
  updateProfessionalHistory,
} from '../../../models/queries/friend-professional-history.queries.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../base/sub-resource.service.js';

/**
 * ProfessionalHistoryService handles all professional history operations for friends.
 * Extends SubResourceService for common CRUD operations.
 */
export class ProfessionalHistoryService extends SubResourceService<
  ProfessionalHistoryInput,
  ProfessionalHistory,
  IGetProfessionalHistoryByFriendIdResult,
  IGetProfessionalHistoryByFriendIdResult,
  IDeleteProfessionalHistoryResult
> {
  constructor(options: SubResourceServiceOptions) {
    super(options, {
      resourceName: 'professional history',
      hasPrimaryFlag: true,

      createFn: async ({ userExternalId, friendExternalId, input }, client) => {
        return createProfessionalHistory.run(
          {
            userExternalId,
            friendExternalId,
            jobTitle: input.job_title ?? null,
            organization: input.organization ?? null,
            department: input.department ?? null,
            notes: input.notes ?? null,
            fromMonth: input.from_month,
            fromYear: input.from_year,
            toMonth: input.to_month ?? null,
            toYear: input.to_year ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client as pg.Pool,
        );
      },

      updateFn: async ({ userExternalId, friendExternalId, resourceExternalId, input }, client) => {
        return updateProfessionalHistory.run(
          {
            userExternalId,
            friendExternalId,
            historyExternalId: resourceExternalId,
            jobTitle: input.job_title ?? null,
            organization: input.organization ?? null,
            department: input.department ?? null,
            notes: input.notes ?? null,
            fromMonth: input.from_month,
            fromYear: input.from_year,
            toMonth: input.to_month ?? null,
            toYear: input.to_year ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client as pg.Pool,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deleteProfessionalHistory.run(
          {
            userExternalId,
            friendExternalId,
            historyExternalId: resourceExternalId,
          },
          client as pg.Pool,
        );
      },

      clearPrimaryFn: async ({ userExternalId, friendExternalId }, client) => {
        return clearPrimaryProfessionalHistory.run(
          { userExternalId, friendExternalId },
          client as pg.Pool,
        );
      },

      isPrimary: (input) => input.is_primary ?? false,

      mapResult: (row): ProfessionalHistory => ({
        id: row.external_id,
        jobTitle: row.job_title ?? undefined,
        organization: row.organization ?? undefined,
        department: row.department ?? undefined,
        notes: row.notes ?? undefined,
        fromMonth: row.from_month,
        fromYear: row.from_year,
        toMonth: row.to_month ?? undefined,
        toYear: row.to_year ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
