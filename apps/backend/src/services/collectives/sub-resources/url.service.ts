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

function mapRow(row: IGetUrlsByCollectiveIdResult) {
  return {
    id: row.external_id,
    url: row.url,
    urlType: parseUrlType(row.url_type),
    label: row.label ?? undefined,
    createdAt: row.created_at.toISOString(),
  } satisfies UrlResponse;
}

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

        async createFn({ userExternalId, ownerExternalId: collectiveExternalId, data }, client) {
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

        async updateFn(
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, data },
          client,
        ) {
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

        async deleteFn(
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId },
          client,
        ) {
          return deleteUrl.run(
            {
              userExternalId,
              collectiveExternalId,
              urlExternalId: resourceExternalId,
            },
            client,
          );
        },

        async listFn({ userExternalId, ownerExternalId: collectiveExternalId }, client) {
          return getUrlsByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
