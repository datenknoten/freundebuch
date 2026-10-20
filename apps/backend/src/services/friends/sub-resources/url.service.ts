import type { UrlResponse, UrlType } from '@freundebuch/shared/index.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import {
  createUrl,
  deleteUrl,
  getUrlsByFriendId,
  type IDeleteUrlResult,
  type IGetUrlsByFriendIdResult,
  updateUrl,
} from '../../../models/queries/friend-urls.queries.js';
import { parseUrlType } from '../../../utils/parse-url-type.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

export interface UrlData {
  url: string;
  urlType: UrlType;
  label?: string;
}

function mapRow(row: IGetUrlsByFriendIdResult) {
  return {
    id: row.external_id,
    url: row.url,
    urlType: parseUrlType(row.url_type),
    label: row.label ?? undefined,
    createdAt: row.created_at.toISOString(),
  } satisfies UrlResponse;
}

export class UrlService extends SubResourceService<
  UrlData,
  UrlResponse,
  IGetUrlsByFriendIdResult,
  IGetUrlsByFriendIdResult,
  IDeleteUrlResult
> {
  constructor(options: SubResourceServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'URL',
        resourceLabel: 'Url',
        ownerNotFound: FriendNotFoundError,
        hasPrimaryFlag: false,

        async createFn({ userExternalId, ownerExternalId: friendExternalId, data }, client) {
          return createUrl.run(
            {
              userExternalId,
              friendExternalId,
              url: data.url,
              urlType: data.urlType,
              label: data.label ?? null,
            },
            client,
          );
        },

        async updateFn(
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId, data },
          client,
        ) {
          return updateUrl.run(
            {
              userExternalId,
              friendExternalId,
              urlExternalId: resourceExternalId,
              url: data.url,
              urlType: data.urlType,
              label: data.label ?? null,
            },
            client,
          );
        },

        async deleteFn(
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId },
          client,
        ) {
          return deleteUrl.run(
            {
              userExternalId,
              friendExternalId,
              urlExternalId: resourceExternalId,
            },
            client,
          );
        },

        async listFn({ userExternalId, ownerExternalId: friendExternalId }, client) {
          return getUrlsByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
