// Generated from one config by createSubResourceRouter.
import { UrlInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import type { UrlService } from '../../../services/friends/sub-resources/url.service.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export interface UrlsRoutesOptions {
  urlService: UrlService;
}

export function createUrlsRoutes(options: UrlsRoutesOptions): Hono<AppContext> {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'urlId',
    resourceLabel: 'Url',
    schema: UrlInputSchema,
    ownerNotFound: FriendNotFoundError,
    service: options.urlService,
  });
}
