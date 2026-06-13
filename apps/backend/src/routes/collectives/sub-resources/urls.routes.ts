import { UrlInputSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveUrlService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { CollectiveNotFoundError, ResourceNotFoundError } from '../../../utils/errors.js';
import { parseBody, requireUuidParam } from '../../../utils/http.js';

const app = new Hono<AppContext>();

/**
 * GET /api/collectives/:id/urls
 * List all URLs for a collective
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = requireUuidParam(c, 'id', 'collective ID');

  const urlService = new CollectiveUrlService({ db, logger });
  const urls = await urlService.list(user.userId, collectiveId);
  return c.json(urls);
});

/**
 * POST /api/collectives/:id/urls
 * Add a URL to a collective
 */
app.post('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = requireUuidParam(c, 'id', 'collective ID');
  const validated = await parseBody(c, UrlInputSchema);

  const urlService = new CollectiveUrlService({ db, logger });
  const url = await urlService.add(user.userId, collectiveId, validated);

  if (!url) {
    throw new CollectiveNotFoundError();
  }

  return c.json(url, 201);
});

/**
 * PUT /api/collectives/:id/urls/:urlId
 * Update a URL
 */
app.put('/:urlId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = requireUuidParam(c, 'id', 'collective ID');
  const urlId = requireUuidParam(c, 'urlId', 'URL ID');
  const validated = await parseBody(c, UrlInputSchema);

  const urlService = new CollectiveUrlService({ db, logger });
  const url = await urlService.update(user.userId, collectiveId, urlId, validated);

  if (!url) {
    throw new ResourceNotFoundError('URL');
  }

  return c.json(url);
});

/**
 * DELETE /api/collectives/:id/urls/:urlId
 * Delete a URL
 */
app.delete('/:urlId', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = requireUuidParam(c, 'id', 'collective ID');
  const urlId = requireUuidParam(c, 'urlId', 'URL ID');

  const urlService = new CollectiveUrlService({ db, logger });
  const deleted = await urlService.delete(user.userId, collectiveId, urlId);

  if (!deleted) {
    throw new ResourceNotFoundError('URL');
  }

  return c.json({ message: 'URL deleted successfully' });
});

export default app;
