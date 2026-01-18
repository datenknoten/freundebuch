import type { Url, UrlInput, UrlType } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  createUrl,
  deleteUrl,
  type IDeleteUrlResult,
  type IGetUrlsByFriendIdResult,
  updateUrl,
} from '../../../models/queries/friend-urls.queries.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../base/sub-resource.service.js';

/**
 * UrlService handles all URL-related operations for friends.
 * Extends SubResourceService for common CRUD operations.
 * Note: URLs do not have a primary flag.
 */
export class UrlService extends SubResourceService<
  UrlInput,
  Url,
  IGetUrlsByFriendIdResult,
  IGetUrlsByFriendIdResult,
  IDeleteUrlResult
> {
  constructor(options: SubResourceServiceOptions) {
    super(options, {
      resourceName: 'URL',
      hasPrimaryFlag: false,

      createFn: async ({ userExternalId, friendExternalId, input }, client) => {
        return createUrl.run(
          {
            userExternalId,
            friendExternalId,
            url: input.url,
            urlType: input.url_type,
            label: input.label ?? null,
          },
          client as pg.Pool,
        );
      },

      updateFn: async ({ userExternalId, friendExternalId, resourceExternalId, input }, client) => {
        return updateUrl.run(
          {
            userExternalId,
            friendExternalId,
            urlExternalId: resourceExternalId,
            url: input.url,
            urlType: input.url_type,
            label: input.label ?? null,
          },
          client as pg.Pool,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deleteUrl.run(
          {
            userExternalId,
            friendExternalId,
            urlExternalId: resourceExternalId,
          },
          client as pg.Pool,
        );
      },

      mapResult: (row): Url => ({
        id: row.external_id,
        url: row.url,
        urlType: row.url_type as UrlType,
        label: row.label ?? undefined,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
