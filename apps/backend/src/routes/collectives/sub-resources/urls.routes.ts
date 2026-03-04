import { type ErrorResponse, UrlInputSchema } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveUrlService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { CollectiveNotFoundError, ValidationError } from '../../../utils/errors.js';
import { isValidUuid } from '../../../utils/security.js';

const app = new Hono<AppContext>();

/**
 * GET /api/collectives/:id/urls
 * List all URLs for a collective
 */
app.get('/', async (c) => {
  const logger = c.get('logger');
  const db = c.get('db');
  const user = getAuthUser(c);
  const collectiveId = c.req.param('id') ?? '';

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

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
  const collectiveId = c.req.param('id') ?? '';

  if (!isValidUuid(collectiveId)) {
    throw new ValidationError('Invalid collective ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = UrlInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

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
  const collectiveId = c.req.param('id') ?? '';
  const urlId = c.req.param('urlId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(urlId)) {
    throw new ValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  const validated = UrlInputSchema(body);

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid request', validated);
  }

  const urlService = new CollectiveUrlService({ db, logger });
  const url = await urlService.update(user.userId, collectiveId, urlId, validated);

  if (!url) {
    return c.json<ErrorResponse>({ error: 'URL not found' }, 404);
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
  const collectiveId = c.req.param('id') ?? '';
  const urlId = c.req.param('urlId') ?? '';

  if (!isValidUuid(collectiveId) || !isValidUuid(urlId)) {
    throw new ValidationError('Invalid ID');
  }

  const urlService = new CollectiveUrlService({ db, logger });
  const deleted = await urlService.delete(user.userId, collectiveId, urlId);

  if (!deleted) {
    return c.json<ErrorResponse>({ error: 'URL not found' }, 404);
  }

  return c.json({ message: 'URL deleted successfully' });
});

export default app;
