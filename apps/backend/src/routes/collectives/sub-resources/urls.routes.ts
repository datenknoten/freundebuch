import { type ErrorResponse, UrlInputSchema } from '@freundebuch/shared/index.js';
import * as Sentry from '@sentry/node';
import { type } from 'arktype';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import { CollectiveUrlService } from '../../../services/collectives/index.js';
import type { AppContext } from '../../../types/context.js';
import { isAppError, toError } from '../../../utils/errors.js';
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
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    const urlService = new CollectiveUrlService({ db, logger });
    const urls = await urlService.list(user.userId, collectiveId);
    return c.json(urls);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to list URLs for collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to list URLs for collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to list URLs' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid collective ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = UrlInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const urlService = new CollectiveUrlService({ db, logger });
    const url = await urlService.add(user.userId, collectiveId, validated);

    if (!url) {
      return c.json<ErrorResponse>({ error: 'Collective not found' }, 404);
    }

    return c.json(url, 201);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to add URL to collective');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId }, 'Failed to add URL to collective');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to add URL' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json<ErrorResponse>({ error: 'Invalid JSON' }, 400);
    }

    const validated = UrlInputSchema(body);

    if (validated instanceof type.errors) {
      return c.json<ErrorResponse>({ error: 'Invalid request', details: validated }, 400);
    }

    const urlService = new CollectiveUrlService({ db, logger });
    const url = await urlService.update(user.userId, collectiveId, urlId, validated);

    if (!url) {
      return c.json<ErrorResponse>({ error: 'URL not found' }, 404);
    }

    return c.json(url);
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to update URL');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, urlId }, 'Failed to update URL');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to update URL' }, 500);
  }
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
    return c.json<ErrorResponse>({ error: 'Invalid ID' }, 400);
  }

  try {
    const urlService = new CollectiveUrlService({ db, logger });
    const deleted = await urlService.delete(user.userId, collectiveId, urlId);

    if (!deleted) {
      return c.json<ErrorResponse>({ error: 'URL not found' }, 404);
    }

    return c.json({ message: 'URL deleted successfully' });
  } catch (error) {
    if (isAppError(error)) {
      logger.error({ err: error }, 'Failed to delete URL');
      return c.json<ErrorResponse>({ error: error.message }, error.statusCode);
    }
    const err = toError(error);
    logger.error({ err, collectiveId, urlId }, 'Failed to delete URL');
    Sentry.captureException(err);
    return c.json<ErrorResponse>({ error: 'Failed to delete URL' }, 500);
  }
});

export default app;
