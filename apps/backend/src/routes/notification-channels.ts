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
import { getAuthUser } from '../middleware/auth.js';
import type { NotificationChannelsService } from '../services/notification-channels.service.js';
import type { AppContext } from '../types/context.js';
import { parseBody } from '../utils/parse-body.js';
import { requireUuidParam } from '../utils/require-uuid-param.js';

// All fields required, for creation
function validateCredentials(platform: string, credentials: object) {
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

  // Every platform's credentials schema is an object of string fields; the
  // switch above loses that per-branch type.
  return validated as Record<string, string>;
}

// All fields optional, for updates: tokens are omitted from API responses for
// security, so partial updates must be allowed.
function validateCredentialsForUpdate(platform: string, credentials: object) {
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

  // Every platform's credentials update schema is an object of string fields;
  // the switch above loses that per-branch type.
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

  app.use('*', authMiddleware);
  app.use('*', onboardingMiddleware);
  app.use('*', rateLimitMiddleware);

  app.get('/', async (c) => {
    const user = getAuthUser(c);

    const result = await notificationChannelsService.listChannels(user.userId);

    return c.json(result);
  });

  app.post('/', async (c) => {
    const user = getAuthUser(c);

    // Two passes: the top-level shape first, then the platform-specific credentials
    const validated = await parseBody(c, NotificationChannelCreateInputSchema);

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

  app.get('/:channelId', async (c) => {
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');

    const result = await notificationChannelsService.getChannel(user.userId, channelId);

    return c.json(result);
  });

  app.put('/:channelId', async (c) => {
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');

    const validated = await parseBody(c, NotificationChannelUpdateInputSchema);

    // Credentials are validated per platform, which only the existing channel knows
    let credentials: Record<string, string> | undefined;
    if (validated.credentials !== undefined) {
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

  app.delete('/:channelId', async (c) => {
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');

    await notificationChannelsService.deleteChannel(user.userId, channelId);

    return c.json({ success: true });
  });

  // Sends a test message to verify the channel works
  app.post('/:channelId/test', testRateLimitMiddleware, async (c) => {
    const user = getAuthUser(c);
    const channelId = requireUuidParam(c, 'channelId', 'channel ID');

    await notificationChannelsService.sendTestMessage(user.userId, channelId);

    return c.json({ success: true });
  });

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
