import { DqNotApplicableInputSchema, DqSnoozeInputSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { etag } from 'hono/etag';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { friendsRateLimitMiddleware } from '../middleware/rate-limit.js';
import { DataQualityService, type DqBucket } from '../services/data-quality/index.js';
import type { AppContext } from '../types/context.js';
import { FriendNotFoundError } from '../utils/errors.js';
import { parseBody, requireUuidParam } from '../utils/http.js';

const app = new Hono<AppContext>();

app.use('*', authMiddleware);
// Must run after authMiddleware.
app.use('*', onboardingMiddleware);
// Reused deliberately: this is friends data, so it needs no separate budget.
app.use('*', friendsRateLimitMiddleware);

// Read-only payloads that change whenever friend data does — cheap revalidation
// without ever serving stale data.
app.use('/suggestions', etag());
app.use('/index', etag());

/** Clamp the `limit` query param to a sane range (default 5). */
function parseLimit(value: string | undefined): number {
  if (value === undefined) return 5;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 5 : Math.min(20, Math.max(1, parsed));
}

/** Clamp the `days` query param to a sane range (default 90). */
function parseDays(value: string | undefined): number {
  if (value === undefined) return 90;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 90 : Math.min(365, Math.max(1, parsed));
}

/** Anything other than a known bucket means "give me both". */
function parseBucket(value: string | undefined): DqBucket | null {
  return value === 'quickwins' || value === 'worthwhile' ? value : null;
}

/**
 * GET /api/data-quality/suggestions
 * Query params: limit (1-20, default 5), bucket (quickwins | worthwhile)
 */
app.get('/suggestions', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);

  const service = new DataQualityService({ db, logger: c.get('logger') });
  const suggestions = await service.getSuggestions(
    user.userId,
    parseLimit(c.req.query('limit')),
    parseBucket(c.req.query('bucket')),
  );

  return c.json(suggestions);
});

/**
 * GET /api/data-quality/index
 * Query params: days (1-365, default 90)
 */
app.get('/index', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);

  const service = new DataQualityService({ db, logger: c.get('logger') });
  const index = await service.getIndex(user.userId, parseDays(c.req.query('days')));

  return c.json(index);
});

/**
 * GET /api/data-quality/friends/:id
 * Per-field data-quality state for one friend.
 */
app.get('/friends/:id', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const friendId = requireUuidParam(c, 'id', 'friend ID');

  const service = new DataQualityService({ db, logger: c.get('logger') });
  const fields = await service.getFriendFields(user.userId, friendId);

  if (!fields) {
    throw new FriendNotFoundError();
  }

  return c.json(fields);
});

/**
 * POST /api/data-quality/snooze
 * Defer a suggestion. The server escalates a second "later" to 90 days.
 */
app.post('/snooze', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const validated = await parseBody(c, DqSnoozeInputSchema);

  const service = new DataQualityService({ db, logger: c.get('logger') });
  const snooze = await service.snooze(user.userId, validated);

  if (!snooze) {
    throw new FriendNotFoundError();
  }

  return c.json(snooze);
});

/**
 * POST /api/data-quality/not-applicable
 * Mark a field as never relevant for a friend (or undo that).
 */
app.post('/not-applicable', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const validated = await parseBody(c, DqNotApplicableInputSchema);

  const service = new DataQualityService({ db, logger: c.get('logger') });
  const updated = await service.setNotApplicable(user.userId, validated);

  if (!updated) {
    throw new FriendNotFoundError();
  }

  return c.json({ message: 'Field updated successfully' });
});

export default app;
