import type { UrlResponse } from '@freundebuch/shared/index.js';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
import {
  createUrl,
  deleteUrl,
  getUrlsByCollectiveId,
  type IDeleteUrlResult,
  type IGetUrlsByCollectiveIdResult,
  updateUrl,
} from '../../../models/queries/collective-urls.queries.js';
import { parseUrlType } from '../../../utils/parse-url-type.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';
import type { UrlData } from '../../friends/sub-resources/url.service.js';

const mapRow = (row: IGetUrlsByCollectiveIdResult): UrlResponse => ({
  id: row.external_id,
  url: row.url,
  urlType: parseUrlType(row.url_type),
  label: row.label ?? undefined,
  createdAt: row.created_at.toISOString(),
});

/**
 * UrlService handles all URL-related operations for collectives.
 * Extends SubResourceService for common CRUD operations.
 */
export class CollectiveUrlService extends SubResourceService<
  UrlData,
  UrlResponse,
  IGetUrlsByCollectiveIdResult,
  IGetUrlsByCollectiveIdResult,
  IDeleteUrlResult
> {
  constructor(options: SubResourceServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'collective url',
        resourceLabel: 'Url',
        ownerNotFound: CollectiveNotFoundError,
        hasPrimaryFlag: false,

        createFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, data },
          client,
        ) => {
          return createUrl.run(
            {
              userExternalId,
              collectiveExternalId,
              url: data.url,
              urlType: data.urlType,
              label: data.label ?? null,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, data },
          client,
        ) => {
          return updateUrl.run(
            {
              userExternalId,
              collectiveExternalId,
              urlExternalId: resourceExternalId,
              url: data.url,
              urlType: data.urlType,
              label: data.label ?? null,
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

        listFn: async ({ userExternalId, ownerExternalId: collectiveExternalId }, client) => {
          return getUrlsByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
