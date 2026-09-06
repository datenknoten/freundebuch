import {
  DiscordCredentialsSchema,
  DiscordCredentialsUpdateSchema,
  MatrixCredentialsSchema,
  MatrixCredentialsUpdateSchema,
  NotificationChannelCreateSchema,
  NotificationChannelToggleSchema,
  NotificationChannelUpdateSchema,
  TelegramCredentialsSchema,
  TelegramCredentialsUpdateSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import {
  notificationChannelsRateLimitMiddleware,
  notificationTestRateLimitMiddleware,
} from '../middleware/rate-limit.js';
import { NotificationChannelsService } from '../services/notification-channels.service.js';
import type { AppContext } from '../types/context.js';
import { NotificationChannelNotFoundError, ValidationError } from '../utils/errors.js';
import { parseBody, requireUuidParam } from '../utils/http.js';

const app = new Hono<AppContext>();

// Apply auth, onboarding, and rate limiting middleware to all routes
app.use('*', authMiddleware);
app.use('*', onboardingMiddleware);
app.use('*', notificationChannelsRateLimitMiddleware);

/**
 * Validate platform-specific credentials (all fields required — for creation)
 */
function validateCredentials(platform: string, credentials: object): Record<string, string> {
  let validated: unknown;
  switch (platform) {
    case 'telegram':
      validated = TelegramCredentialsSchema(credentials);
      break;
    case 'matrix':
      validated = MatrixCredentialsSchema(credentials);
      break;
    case 'discord':
      validated = DiscordCredentialsSchema(credentials);
      break;
    default:
      throw new ValidationError(`Unknown platform: ${platform}`);
  }

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid credentials', validated);
  }

  return validated as Record<string, string>;
}

/**
 * Validate platform-specific credentials (all fields optional — for updates)
 * Tokens are omitted from API responses for security, so partial updates must be allowed.
 */
function validateCredentialsForUpdate(
  platform: string,
  credentials: object,
): Record<string, string> {
  let validated: unknown;
  switch (platform) {
    case 'telegram':
      validated = TelegramCredentialsUpdateSchema(credentials);
      break;
    case 'matrix':
      validated = MatrixCredentialsUpdateSchema(credentials);
      break;
    case 'discord':
      validated = DiscordCredentialsUpdateSchema(credentials);
      break;
    default:
      throw new ValidationError(`Unknown platform: ${platform}`);
  }

  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid credentials', validated);
  }

  return validated as Record<string, string>;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/notification-channels
 * List all channels for the authenticated user
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);

  const service = new NotificationChannelsService(db);
  const result = await service.listChannels(user.userId);

  return c.json(result);
});

/**
 * POST /api/notification-channels
 * Create a new notification channel
 */
app.post('/', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);

  // First pass: validate top-level shape
  const validated = await parseBody(c, NotificationChannelCreateSchema);

  // Second pass: validate platform-specific credentials
  const credentials = validateCredentials(validated.platform, validated.credentials);

  const service = new NotificationChannelsService(db);
  const result = await service.createChannel(user.userId, {
    platform: validated.platform,
    isEnabled: validated.isEnabled,
    lookaheadDays: validated.lookaheadDays,
    notifyTime: validated.notifyTime,
    credentials,
  });

  return c.json(result, 201);
});

/**
 * GET /api/notification-channels/:channelId
 * Get a single channel by external ID
 */
app.get('/:channelId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const channelId = requireUuidParam(c, 'channelId', 'channel ID');

  const service = new NotificationChannelsService(db);
  const result = await service.getChannel(user.userId, channelId);

  return c.json(result);
});

/**
 * PUT /api/notification-channels/:channelId
 * Update an existing channel
 */
app.put('/:channelId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const channelId = requireUuidParam(c, 'channelId', 'channel ID');

  // First pass: validate top-level shape
  const validated = await parseBody(c, NotificationChannelUpdateSchema);

  // If credentials provided, fetch existing channel to know the platform
  let credentials: Record<string, string> | undefined;
  if (validated.credentials) {
    const service = new NotificationChannelsService(db);
    const existing = await service.getChannel(user.userId, channelId);
    credentials = validateCredentialsForUpdate(existing.platform, validated.credentials);
  }

  const service = new NotificationChannelsService(db);
  const result = await service.updateChannel(user.userId, channelId, {
    isEnabled: validated.isEnabled,
    lookaheadDays: validated.lookaheadDays,
    notifyTime: validated.notifyTime,
    credentials,
  });

  return c.json(result);
});

/**
 * DELETE /api/notification-channels/:channelId
 * Delete a channel
 */
app.delete('/:channelId', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const channelId = requireUuidParam(c, 'channelId', 'channel ID');

  const service = new NotificationChannelsService(db);
  const deleted = await service.deleteChannel(user.userId, channelId);

  if (!deleted) {
    throw new NotificationChannelNotFoundError();
  }

  return c.json({ success: true });
});

/**
 * POST /api/notification-channels/:channelId/test
 * Send a test message to verify the channel works
 */
app.post('/:channelId/test', notificationTestRateLimitMiddleware, async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const channelId = requireUuidParam(c, 'channelId', 'channel ID');

  const service = new NotificationChannelsService(db);
  await service.sendTestMessage(user.userId, channelId);

  return c.json({ success: true });
});

/**
 * PATCH /api/notification-channels/:channelId/toggle
 * Enable or disable a channel
 */
app.patch('/:channelId/toggle', async (c) => {
  const db = c.get('db');
  const user = getAuthUser(c);
  const channelId = requireUuidParam(c, 'channelId', 'channel ID');
  const validated = await parseBody(c, NotificationChannelToggleSchema);

  const service = new NotificationChannelsService(db);
  const result = await service.toggleChannel(user.userId, channelId, validated.isEnabled);

  return c.json(result);
});

export default app;
