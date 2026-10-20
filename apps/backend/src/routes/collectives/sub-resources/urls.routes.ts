// Generated from one config by createSubResourceRouter.
import { UrlInputSchema } from '@freundebuch/shared/index.js';
import type { CollectiveUrlService } from '../../../services/collectives/sub-resources/url.service.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapUrlInput } from '../../mappers/map-url-input.js';

export interface CollectiveUrlsRoutesOptions {
  collectiveUrlService: CollectiveUrlService;
}

export function createCollectiveUrlsRoutes(options: CollectiveUrlsRoutesOptions) {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'collective ID',
    resourceParam: 'urlId',
    resourceLabel: 'Url',
    schema: UrlInputSchema,
    mapInput: mapUrlInput,
    service: options.collectiveUrlService,
  });
}
