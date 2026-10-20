import type { ProfessionalHistoryResponse } from '@freundebuch/shared/index.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
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

export interface ProfessionalHistoryData {
  jobTitle?: string | null;
  organization?: string | null;
  department?: string | null;
  notes?: string | null;
  fromMonth: number;
  fromYear: number;
  toMonth?: number | null;
  toYear?: number | null;
  isPrimary: boolean;
}

function mapRow(row: IGetProfessionalHistoryByFriendIdResult) {
  return {
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
  } satisfies ProfessionalHistoryResponse;
}

export class ProfessionalHistoryService extends SubResourceService<
  ProfessionalHistoryData,
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
        resourceLabel: 'Professional history entry',
        ownerNotFound: FriendNotFoundError,
        hasPrimaryFlag: true,

        async createFn({ userExternalId, ownerExternalId: friendExternalId, data }, client) {
          return createProfessionalHistory.run(
            {
              userExternalId,
              friendExternalId,
              jobTitle: data.jobTitle ?? null,
              organization: data.organization ?? null,
              department: data.department ?? null,
              notes: data.notes ?? null,
              fromMonth: data.fromMonth,
              fromYear: data.fromYear,
              toMonth: data.toMonth ?? null,
              toYear: data.toYear ?? null,
              isPrimary: data.isPrimary,
            },
            client,
          );
        },

        async updateFn(
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId, data },
          client,
        ) {
          return updateProfessionalHistory.run(
            {
              userExternalId,
              friendExternalId,
              historyExternalId: resourceExternalId,
              jobTitle: data.jobTitle ?? null,
              organization: data.organization ?? null,
              department: data.department ?? null,
              notes: data.notes ?? null,
              fromMonth: data.fromMonth,
              fromYear: data.fromYear,
              toMonth: data.toMonth ?? null,
              toYear: data.toYear ?? null,
              isPrimary: data.isPrimary,
            },
            client,
          );
        },

        async deleteFn(
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId },
          client,
        ) {
          return deleteProfessionalHistory.run(
            {
              userExternalId,
              friendExternalId,
              historyExternalId: resourceExternalId,
            },
            client,
          );
        },

        async clearPrimaryFn({ userExternalId, ownerExternalId: friendExternalId }, client) {
          return clearPrimaryProfessionalHistory.run({ userExternalId, friendExternalId }, client);
        },

        isPrimary(data) {
          return data.isPrimary;
        },

        setIsPrimary(data, isPrimary) {
          return { ...data, isPrimary };
        },

        async listFn({ userExternalId, ownerExternalId: friendExternalId }, client) {
          return getProfessionalHistoryByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
