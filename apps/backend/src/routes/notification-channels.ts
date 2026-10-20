import { ValidationError } from '@datenknoten/kit';
import {
  DiscordCredentialsSchema,
  DiscordCredentialsUpdateSchema,
  MatrixCredentialsSchema,
  MatrixCredentialsUpdateSchema,
  NotificationChannelCreateInputSchema,
  NotificationChannelToggleInputSchema,
  NotificationChannelUpdateInputSchema,
  TelegramCredentialsSchema,
  TelegramCredentialsUpdateSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono, type MiddlewareHandler } from 'hono';
import { NotificationChannelNotFoundError } from '../errors/notification-channel-not-found.error.js';
import { getAuthUser } from '../middleware/auth.js';
import type { NotificationChannelsService } from '../services/notification-channels.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

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

export interface NotificationChannelsRoutesOptions {
  notificationChannelsService: NotificationChannelsService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
  testRateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createNotificationChannelsRoutes(options: NotificationChannelsRoutesOptions) {
  const {
    notificationChannelsService,
    authMiddleware,
    onboardingMiddleware,
    rateLimitMiddleware,
    testRateLimitMiddleware,
  } = options;
  const app = new Hono<AppContext>();

  // Apply auth, onboarding, and rate limiting middleware to all routes
  app.use('*', authMiddleware);
  app.use('*', onboardingMiddleware);
  app.use('*', rateLimitMiddleware);

  // ============================================================================
  // Routes
  // ============================================================================

  /**
   * GET /api/notification-channels
   * List all channels for the authenticated user
   */
  app.get('/', async (c) => {
    const user = getAuthUser(c);

    const result = await notificationChannelsService.listChannels(user.userId);

    return c.json(result);
  });

  /**
   * POST /api/notification-channels
   * Create a new notification channel
   */
  app.post('/', async (c) => {
    const user = getAuthUser(c);

    // First pass: validate top-level shape
    const validated = await parseBody(c, NotificationChannelCreateInputSchema);

    // Second pass: validate platform-specific credentials
    const credentials = validateCredentials(validated.platform, validated.credentials);

    const result = await notificationChannelsService.createChannel(user.userId, {
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
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');

    const result = await notificationChannelsService.getChannel(user.userId, channelId);

    return c.json(result);
  });

  /**
   * PUT /api/notification-channels/:channelId
   * Update an existing channel
   */
  app.put('/:channelId', async (c) => {
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');

    // First pass: validate top-level shape
    const validated = await parseBody(c, NotificationChannelUpdateInputSchema);

    // If credentials provided, fetch existing channel to know the platform
    let credentials: Record<string, string> | undefined;
    if (validated.credentials) {
      const existing = await notificationChannelsService.getChannel(user.userId, channelId);
      credentials = validateCredentialsForUpdate(existing.platform, validated.credentials);
    }

    const result = await notificationChannelsService.updateChannel(user.userId, channelId, {
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
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');

    const isDeleted = await notificationChannelsService.deleteChannel(user.userId, channelId);

    if (!isDeleted) {
      throw new NotificationChannelNotFoundError(channelId);
    }

    return c.json({ success: true });
  });

  /**
   * POST /api/notification-channels/:channelId/test
   * Send a test message to verify the channel works
   */
  app.post('/:channelId/test', testRateLimitMiddleware, async (c) => {
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');

    await notificationChannelsService.sendTestMessage(user.userId, channelId);

    return c.json({ success: true });
  });

  /**
   * PATCH /api/notification-channels/:channelId/toggle
   * Enable or disable a channel
   */
  app.patch('/:channelId/toggle', async (c) => {
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');
    const validated = await parseBody(c, NotificationChannelToggleInputSchema);

    const result = await notificationChannelsService.toggleChannel(
      user.userId,
      channelId,
      validated.isEnabled,
    );

    return c.json(result);
  });

  return app;
}
