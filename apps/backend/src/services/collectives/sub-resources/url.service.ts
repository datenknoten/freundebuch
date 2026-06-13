import type { Url, UrlInput } from '@freundebuch/shared/index.js';
import {
  createUrl,
  deleteUrl,
  getUrlsByCollectiveId,
  type IDeleteUrlResult,
  type IGetUrlsByCollectiveIdResult,
  updateUrl,
} from '../../../models/queries/collective-urls.queries.js';
import { parseUrlType } from '../../../utils/type-guards.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

/**
 * UrlService handles all URL-related operations for collectives.
 * Extends SubResourceService for common CRUD operations.
 */
export class CollectiveUrlService extends SubResourceService<
  UrlInput,
  Url,
  IGetUrlsByCollectiveIdResult,
  IGetUrlsByCollectiveIdResult,
  IDeleteUrlResult
> {
  constructor(options: SubResourceServiceOptions) {
    super(options, {
      resourceName: 'collective url',
      hasPrimaryFlag: false,

      listFn: async ({ userExternalId, ownerExternalId: collectiveExternalId }, client) => {
        return getUrlsByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
      },

      mapListResult: (row): Url => ({
        id: row.external_id,
        url: row.url,
        urlType: parseUrlType(row.url_type),
        label: row.label ?? undefined,
        createdAt: row.created_at.toISOString(),
      }),

      createFn: async (
        { userExternalId, ownerExternalId: collectiveExternalId, input },
        client,
      ) => {
        return createUrl.run(
          {
            userExternalId,
            collectiveExternalId,
            url: input.url,
            urlType: input.url_type,
            label: input.label ?? null,
          },
          client,
        );
      },

      updateFn: async (
        { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, input },
        client,
      ) => {
        return updateUrl.run(
          {
            userExternalId,
            collectiveExternalId,
            urlExternalId: resourceExternalId,
            url: input.url,
            urlType: input.url_type,
            label: input.label ?? null,
          },
          client,
        );
      },

      deleteFn: async (
        { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId },
        client,
      ) => {
        return deleteUrl.run(
          {
            userExternalId,
            collectiveExternalId,
            urlExternalId: resourceExternalId,
          },
          client,
        );
      },

      mapResult: (row): Url => ({
        id: row.external_id,
        url: row.url,
        urlType: parseUrlType(row.url_type),
        label: row.label ?? undefined,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
