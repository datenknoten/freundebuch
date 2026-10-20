import type {
  ProfessionalHistoryInput,
  ProfessionalHistoryResponse,
} from '@freundebuch/shared/index.js';
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
} from '../../base/sub-resource.service.js';

const mapRow = (row: IGetProfessionalHistoryByFriendIdResult): ProfessionalHistoryResponse => ({
  id: row.external_id,
  jobTitle: row.job_title ?? undefined,
  organization: row.organization ?? undefined,
  department: row.department ?? undefined,
  notes: row.notes ?? undefined,
  fromMonth: row.from_month,
  fromYear: row.from_year,
  toMonth: row.to_month,
  toYear: row.to_year,
  isPrimary: row.is_primary,
  createdAt: row.created_at.toISOString(),
});

/**
 * ProfessionalHistoryService handles all professional history operations for friends.
 * Extends SubResourceService for common CRUD operations.
 */
export class ProfessionalHistoryService extends SubResourceService<
  ProfessionalHistoryInput,
  ProfessionalHistoryResponse,
  IGetProfessionalHistoryByFriendIdResult,
  IGetProfessionalHistoryByFriendIdResult,
  IDeleteProfessionalHistoryResult
> {
  constructor(options: SubResourceServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'professional history',
        hasPrimaryFlag: true,

        createFn: async ({ userExternalId, ownerExternalId: friendExternalId, input }, client) => {
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
              isPrimary: input.is_primary,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId, input },
          client,
        ) => {
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
              isPrimary: input.is_primary,
            },
            client,
          );
        },

        deleteFn: async (
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId },
          client,
        ) => {
          return deleteProfessionalHistory.run(
            {
              userExternalId,
              friendExternalId,
              historyExternalId: resourceExternalId,
            },
            client,
          );
        },

        clearPrimaryFn: async ({ userExternalId, ownerExternalId: friendExternalId }, client) => {
          return clearPrimaryProfessionalHistory.run({ userExternalId, friendExternalId }, client);
        },

        isPrimary: (input) => input.is_primary,

        setIsPrimary: (input, isPrimary) => ({ ...input, is_primary: isPrimary }),

        listFn: async ({ userExternalId, ownerExternalId: friendExternalId }, client) => {
          return getProfessionalHistoryByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
