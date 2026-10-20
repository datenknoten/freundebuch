// Generated from one config by createSubResourceRouter.
import { UrlInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import type { UrlService } from '../../../services/friends/sub-resources/url.service.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapUrlInput } from '../../mappers/map-url-input.js';

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
    mapInput: mapUrlInput,
    service: options.urlService,
  });
}
