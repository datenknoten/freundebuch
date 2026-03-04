import type { ProfessionalHistory, ProfessionalHistoryInput } from '@freundebuch/shared/index.js';
import {
  clearPrimaryProfessionalHistory,
  createProfessionalHistory,
  deleteProfessionalHistory,
  getProfessionalHistoryByFriendId,
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
          client,
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
          client,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deleteProfessionalHistory.run(
          {
            userExternalId,
            friendExternalId,
            historyExternalId: resourceExternalId,
          },
          client,
        );
      },

      clearPrimaryFn: async ({ userExternalId, friendExternalId }, client) => {
        return clearPrimaryProfessionalHistory.run({ userExternalId, friendExternalId }, client);
      },

      countFn: async ({ userExternalId, friendExternalId }, client) => {
        return getProfessionalHistoryByFriendId.run({ userExternalId, friendExternalId }, client);
      },

      isPrimary: (input) => input.is_primary ?? false,

      setIsPrimary: (input, value) => ({ ...input, is_primary: value }),

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
