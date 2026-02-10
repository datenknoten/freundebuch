import type { Url, UrlInput, UrlType } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  createUrl,
  deleteUrl,
  getUrlsByCollectiveId,
  type IDeleteUrlResult,
  type IGetUrlsByCollectiveIdResult,
  updateUrl,
} from '../../../models/queries/collective-urls.queries.js';
import {
  CollectiveSubResourceService,
  type CollectiveSubResourceServiceOptions,
} from './base.service.js';

/**
 * UrlService handles all URL-related operations for collectives.
 * Extends CollectiveSubResourceService for common CRUD operations.
 */
export class CollectiveUrlService extends CollectiveSubResourceService<
  UrlInput,
  Url,
  IGetUrlsByCollectiveIdResult,
  IGetUrlsByCollectiveIdResult,
  IDeleteUrlResult
> {
  constructor(options: CollectiveSubResourceServiceOptions) {
    super(options, {
      resourceName: 'collective url',
      hasPrimaryFlag: false,

      listFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return getUrlsByCollectiveId.run(
          { userExternalId, collectiveExternalId },
          client as pg.Pool,
        );
      },

      mapListResult: (row): Url => ({
        id: row.external_id,
        url: row.url,
        urlType: row.url_type as UrlType,
        label: row.label ?? undefined,
        createdAt: row.created_at.toISOString(),
      }),

      createFn: async ({ userExternalId, collectiveExternalId, input }, client) => {
        return createUrl.run(
          {
            userExternalId,
            collectiveExternalId,
            url: input.url,
            urlType: input.url_type,
            label: input.label ?? null,
          },
          client as pg.Pool,
        );
      },

      updateFn: async (
        { userExternalId, collectiveExternalId, resourceExternalId, input },
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
          client as pg.Pool,
        );
      },

      deleteFn: async ({ userExternalId, collectiveExternalId, resourceExternalId }, client) => {
        return deleteUrl.run(
          {
            userExternalId,
            collectiveExternalId,
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
