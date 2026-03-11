# Feature: Upcoming Dates Notifications via Messaging Bots

**Project:** freundebuch2
**Type:** Feature
**Related Epic:** [Epic 3: Reminder System](../epics/epic-03-planned-reminder-system.md)
**Phase:** Phase 2 (Core Functionality)
**Priority:** Medium

---

## Summary

Allow users to configure bot accounts for Telegram, Matrix, and Discord so that Freundebuch can send a daily digest of upcoming dates (birthdays, anniversaries, and other saved dates) directly into their preferred messaging platform.

This extends the notification channels described in Epic 3, which currently covers in-app notifications, email, and browser push. Messaging bots are a natural fit for self-hosters who already live in these platforms and want reminders to arrive where they actually pay attention.

---

## Background

Freundebuch already stores friend dates in `friends.friend_dates` with fields for `date_value`, `year_known`, `date_type` (`birthday`, `anniversary`, `other`), and `label`. There is also an existing `GetUpcomingDates` PgTyped query that calculates `days_until` for all dates belonging to a user, handling leap-year edge cases correctly.

The backend already has a `node-cron` scheduler at `apps/backend/src/utils/scheduler.ts` that runs hourly cleanup jobs. A daily notification job can be added alongside the existing `setupCleanupScheduler` function without any new infrastructure.

User preferences are stored as JSONB in `auth.users.preferences`. This issue proposes a dedicated `system.notification_channels` table instead of stuffing bot credentials into the preferences blob, because credentials need to be stored, validated, and referenced independently per channel, and because per-channel preferences (lookahead window, notify time) belong alongside the credentials rather than in a global preferences object.

---

## Feature Description

### 1. Bot Channel Configuration

Users can configure one or more messaging bot channels from the settings page. The supported platforms are:

**Telegram**
- Bot token (obtained from BotFather)
- Chat ID (the target personal chat or group chat)

**Matrix**
- Homeserver URL (e.g., `https://matrix.example.com`)
- Access token
- Room ID (e.g., `!roomid:example.com`)

**Discord**
- Webhook URL (generated from a Discord server channel's Integrations settings)

Each channel can be individually enabled or disabled without deleting the configuration. Users can also send a test message to verify a channel works before relying on it.

### 2. Daily Notification Job

A new scheduled job fires once per day at a user-configurable time (default: 08:00, compared against UTC). For each user who has at least one active notification channel, the job:

1. Queries upcoming dates using the existing `GetUpcomingDates` logic with the user's configured lookahead window (default: 7 days)
2. Skips the user entirely if there are no upcoming dates in the window - no message is sent
3. Formats a summary message
4. Dispatches the message to each active channel for that user

If delivery to one channel fails (network error, bad credentials, etc.), the failure is logged and captured in Sentry but does not block delivery to other channels. The job does not retry automatically; the user should correct their channel configuration if messages stop arriving.

### 3. Notification Message Format

The message should be concise and warm. Example for a day with two upcoming dates:

```
Freundebuch - Upcoming dates

Tomorrow: Anna Bauer's birthday (March 11)
In 5 days: Jan & Sarah's wedding anniversary (March 15)

View your Freundebuch: https://your-instance.example.com
```

Formatting rules:
- Dates are listed in ascending `days_until` order, matching the existing query's sort
- "Today" / "Tomorrow" / "In N days" phrasing for `days_until` of 0, 1, and 2+ respectively
- For dates where `year_known` is `false`, omit any age calculation and show only the event name and calendar date
- For `date_type = 'other'`, use the `label` field as the event name
- The instance base URL is appended as a convenience link; it falls back to being omitted if the instance URL is not configured in system settings
- If there are no upcoming dates in the lookahead window, no message is sent at all

Platform-specific formatting notes:
- **Telegram**: Plain text; Markdown formatting can be added in a follow-up
- **Matrix**: Send both a plain text `body` and an HTML-formatted `formatted_body` in the `m.room.message` event
- **Discord**: Plain text in the `content` field of the webhook payload

---

## Database Changes

### New Table: `system.notification_channels`

```sql
CREATE TABLE IF NOT EXISTS system.notification_channels (
    id                  SERIAL PRIMARY KEY,
    external_id         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id             INTEGER NOT NULL,
    platform            TEXT NOT NULL CHECK (platform IN ('telegram', 'matrix', 'discord')),
    is_enabled          BOOLEAN NOT NULL DEFAULT true,

    -- Telegram
    telegram_bot_token  TEXT,
    telegram_chat_id    TEXT,

    -- Matrix
    matrix_homeserver   TEXT,
    matrix_access_token TEXT,
    matrix_room_id      TEXT,

    -- Discord
    discord_webhook_url TEXT,

    -- Per-channel notification preferences
    lookahead_days      INTEGER NOT NULL DEFAULT 7 CHECK (lookahead_days BETWEEN 1 AND 30),
    notify_time         TIME NOT NULL DEFAULT '08:00:00',

    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_channels_user_id
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

    -- One row per platform per user
    CONSTRAINT uq_notification_channels_user_platform
        UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_external_id
    ON system.notification_channels(external_id);

CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id
    ON system.notification_channels(user_id);

-- Partial index for the scheduler: only scan rows that are actually enabled
CREATE INDEX IF NOT EXISTS idx_notification_channels_enabled
    ON system.notification_channels(notify_time)
    WHERE is_enabled = true;
```

**Schema notes:**
- The `system` schema is already created as part of Epic 0 migrations
- Credentials are stored in plaintext columns. Self-hosted deployments are responsible for securing their PostgreSQL instance at the infrastructure level. A future enhancement could add column-level encryption
- The unique constraint on `(user_id, platform)` means each user has at most one configuration per platform. To change a bot, they update the existing row
- `notify_time` stores the time-of-day for delivery. The scheduler compares each enabled channel's `notify_time` against the current UTC time. Per-user timezone support is out of scope for this issue (see Out of Scope)
- `lookahead_days` is stored per channel so a user could receive a 7-day digest on Telegram and a 14-day digest on Discord if they prefer
- A trigger for `updated_at` must be added following the project convention

---

## API Endpoints

All endpoints require authentication. Channels are always addressed by `external_id`, never by internal `id`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notification-channels` | List all configured channels for the current user |
| POST | `/api/notification-channels` | Create a new channel configuration |
| GET | `/api/notification-channels/:channelId` | Get a single channel by `external_id` |
| PUT | `/api/notification-channels/:channelId` | Update an existing channel (credentials, preferences) |
| DELETE | `/api/notification-channels/:channelId` | Remove a channel configuration entirely |
| POST | `/api/notification-channels/:channelId/test` | Send a test message to verify the channel works |
| PATCH | `/api/notification-channels/:channelId/toggle` | Enable or disable a channel without a full update |

### Response Shape (single channel)

```typescript
{
  externalId: string,            // UUID - always use this in API calls
  platform: 'telegram' | 'matrix' | 'discord',
  isEnabled: boolean,
  lookaheadDays: number,
  notifyTime: string,            // "HH:MM" 24-hour format
  credentials: {
    // Telegram
    botToken?: string,           // masked in responses: "...1234"
    chatId?: string,

    // Matrix
    homeserver?: string,         // not masked (not a secret)
    accessToken?: string,        // masked: "...5678"
    roomId?: string,             // not masked

    // Discord
    webhookUrl?: string,         // masked: "https://discord.com/api/webhooks/.../...abcd"
  },
  createdAt: string,             // ISO 8601
  updatedAt: string,
}
```

Credential fields that are secrets (tokens, bot tokens, the token portion of webhook URLs) are masked in all GET responses. The full value is accepted on POST/PUT and stored, but never returned after the initial write. The frontend should treat existing credential fields as write-only after save and prompt the user to re-enter if they want to change them.

---

## ArkType Validation

```typescript
import { type } from 'arktype';

const NotificationChannelCreateSchema = type({
  platform: '"telegram" | "matrix" | "discord"',
  'isEnabled?': 'boolean',
  'lookaheadDays?': 'number.integer >= 1 & number.integer <= 30',
  'notifyTime?': /^([01]\d|2[0-3]):[0-5]\d$/,
  credentials: 'object',
});

const NotificationChannelUpdateSchema = type({
  'isEnabled?': 'boolean',
  'lookaheadDays?': 'number.integer >= 1 & number.integer <= 30',
  'notifyTime?': /^([01]\d|2[0-3]):[0-5]\d$/,
  'credentials?': 'object',
});

// Applied conditionally after platform is known
const TelegramCredentialsSchema = type({
  botToken: 'string > 0',
  chatId: 'string > 0',
});

const MatrixCredentialsSchema = type({
  homeserver: /^https?:\/\/.+/,
  accessToken: 'string > 0',
  roomId: /^!.+:.+/,
});

const DiscordCredentialsSchema = type({
  webhookUrl: /^https:\/\/discord(app)?\.com\/api\/webhooks\/.+\/.+/,
});
```

**Validation flow in the route handler:**

1. The route handler parses the incoming body with `NotificationChannelCreateSchema` (or `NotificationChannelUpdateSchema` for PUT). This validates the top-level shape, including that `credentials` is an object and `platform` is one of the three allowed values.
2. Immediately after step 1 succeeds, the route handler reads the now-validated `platform` field and applies the corresponding platform-specific schema (`TelegramCredentialsSchema`, `MatrixCredentialsSchema`, or `DiscordCredentialsSchema`) to the `credentials` object. This second-pass validation happens in the route handler, not in the service layer, so that invalid input is rejected before any service call is made.
3. If either validation step fails, a `400` response is returned with the ArkType validation errors.

Credentials are validated structurally but not verified against the live platform API at save time; the "Send test message" action serves that purpose.

---

## Backend Implementation

### Custom Error Classes

Add to `apps/backend/src/utils/errors.ts`, following the existing pattern (e.g., `FriendNotFoundError`, `CircleNameExistsError`):

```typescript
// 404 - channel not found
export class NotificationChannelNotFoundError extends AppError {
  statusCode = 404 as const;
  constructor(externalId: string, options?: ErrorOptions) {
    super(`Notification channel not found: ${externalId}`, options);
    Error.captureStackTrace(this, this.constructor);
  }
}

// 409 - duplicate platform for user
export class NotificationChannelAlreadyExistsError extends AppError {
  statusCode = 409 as const;
  constructor(platform: string, options?: ErrorOptions) {
    super(`A ${platform} notification channel already exists for this user`, options);
    Error.captureStackTrace(this, this.constructor);
  }
}

// 502 - external messaging platform returned an error
export class NotificationDeliveryError extends AppError {
  statusCode = 502 as const;
  constructor(platform: string, detail?: string, options?: ErrorOptions) {
    super(`Failed to deliver ${platform} notification${detail ? `: ${detail}` : ''}`, options);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

`NotificationChannelNotFoundError` is thrown by the service when a lookup by `external_id` returns no rows. `NotificationChannelAlreadyExistsError` is thrown when the unique constraint `(user_id, platform)` is violated. `NotificationDeliveryError` wraps transport failures from the external platform clients and is used by the test-message endpoint to return a `502` to the caller.

### New Service: `NotificationChannelsService`

Place at `apps/backend/src/services/notification-channels.service.ts`, following the existing service pattern (e.g., `circles.service.ts`). Responsibilities:

- CRUD operations against `system.notification_channels`, using PgTyped queries
- Credential masking for GET responses
- Delegating test message dispatch to the platform-specific clients

### New Scheduler Function: `setupNotificationScheduler`

Add to `apps/backend/src/utils/scheduler.ts` alongside `setupCleanupScheduler`.

The job runs every minute and checks which enabled channels have a `notify_time` matching the current UTC hour and minute. This avoids a single fixed daily trigger that could miss windows for users with different preferred times, and keeps the pattern consistent with the existing scheduler.

```typescript
// Conceptual outline - not final code
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

  const dueChannels = await getEnabledChannelsDueAt.run({ notifyTime: currentTime }, pool);

  for (const channel of dueChannels) {
    try {
      const upcomingDates = await getUpcomingDates.run({
        userExternalId: channel.user_external_id,
        maxDays: channel.lookahead_days,
        limitCount: 50,
      }, pool);

      if (upcomingDates.length === 0) continue;

      const message = formatNotificationMessage(upcomingDates);
      await dispatch(channel, message);
      logger.info({ channelExternalId: channel.external_id }, 'Notification dispatched');
    } catch (error) {
      const err = toError(error);
      logger.error({ err, channelExternalId: channel.external_id }, 'Failed to dispatch notification');
      Sentry.captureException(err);
    }
  }
});
```

A new PgTyped query `getEnabledChannelsDueAt` is needed that selects from `system.notification_channels` where `is_enabled = true` and `notify_time = :notifyTime`, joining to `auth.users` to retrieve `user_external_id`.

**Important:** The scheduler pseudo-code above calls `getUpcomingDates` with `maxDays` and `limitCount` parameters. The existing `GetUpcomingDates` query in `friend-dates.sql` already accepts these exact parameters (`maxDays` for the lookahead window, `limitCount` for the result limit), so no modification to the existing query is needed. The scheduler reuses it as-is — the only difference from the frontend dashboard usage is that different values are passed at call time (per-channel `lookahead_days` rather than a hardcoded default). A new query is **not** required; the existing one is fully compatible.

### New External Clients

Create under `apps/backend/src/services/external/`:

| File | Platform | API Used |
|------|----------|----------|
| `telegram.client.ts` | Telegram | `POST https://api.telegram.org/bot{token}/sendMessage` |
| `matrix.client.ts` | Matrix | `PUT {homeserver}/_matrix/client/v3/rooms/{roomId}/send/m.room.message/{txnId}` |
| `discord.client.ts` | Discord | `POST {webhookUrl}` |

Each client is a plain async function accepting the relevant credentials and message string. Native `fetch` (available in Node 24+) is sufficient; no new HTTP client dependency is needed.

---

## Frontend Changes

### Settings Page

Add a "Messaging Reminders" section to the existing profile/settings page at `apps/frontend/src/routes/profile/+page.svelte`.

The section contains:
- A short description of what messaging reminders do
- A list of configured channels, each showing platform name, enabled/disabled status, and last-updated date
- An "Add channel" button that opens a form for selecting a new platform and entering its credentials
- Per-channel actions: Edit, Send test message, Enable/Disable toggle, Delete

### New Components

| Component | Description |
|-----------|-------------|
| `NotificationChannelList.svelte` | Renders the full list of configured channels |
| `NotificationChannelCard.svelte` | Single channel with toggle, test, and delete actions |
| `NotificationChannelForm.svelte` | Platform-aware form; renders different credential fields based on the selected platform |
| `TestMessageButton.svelte` | Button that fires the test endpoint and shows inline success or error feedback |

### i18n Keys

New translation keys needed in both English (`en`) and German (`de`):

```
settings.messagingReminders.title
settings.messagingReminders.description
settings.messagingReminders.addChannel
settings.messagingReminders.noChannels
settings.messagingReminders.platform.telegram
settings.messagingReminders.platform.matrix
settings.messagingReminders.platform.discord
settings.messagingReminders.fields.botToken
settings.messagingReminders.fields.chatId
settings.messagingReminders.fields.homeserver
settings.messagingReminders.fields.accessToken
settings.messagingReminders.fields.roomId
settings.messagingReminders.fields.webhookUrl
settings.messagingReminders.fields.lookaheadDays
settings.messagingReminders.fields.notifyTime
settings.messagingReminders.test.button
settings.messagingReminders.test.success
settings.messagingReminders.test.failure
settings.messagingReminders.toggle.enable
settings.messagingReminders.toggle.disable
settings.messagingReminders.delete.confirm
```

---

## Acceptance Criteria

- [ ] A user can add a Telegram channel by providing a bot token and chat ID; the configuration is saved and appears in the channel list
- [ ] A user can add a Matrix channel by providing a homeserver URL, access token, and room ID
- [ ] A user can add a Discord channel by providing a webhook URL
- [ ] Only one configuration per platform per user is allowed; attempting to create a second channel for the same platform returns a clear error
- [ ] Secret credential fields (bot tokens, access tokens, the token portion of webhook URLs) are masked in API GET responses and never returned in full after the initial save
- [ ] The "Send test message" action delivers a message to the configured channel and shows the user a success confirmation or a descriptive error within 10 seconds
- [ ] The daily job fires at the user's configured `notify_time` and sends a digest only when there are upcoming dates within the `lookahead_days` window
- [ ] No message is sent on days when there are no upcoming dates in the lookahead window
- [ ] A channel can be toggled off; the job skips disabled channels entirely
- [ ] Deleting a channel removes the row and all associated credentials from the database
- [ ] If delivery to one channel fails, other channels for the same user are still attempted; each failure is logged and captured in Sentry
- [ ] An invalid Discord webhook URL (wrong domain or path format) is rejected at the API level with a `400` response
- [ ] An invalid Matrix room ID format (must start with `!` and contain `:`) is rejected at the API level with a `400` response
- [ ] All new settings UI strings are available in both English and German
- [ ] The migration includes a proper `down()` function that drops `system.notification_channels`
- [ ] The `updated_at` trigger is created for `system.notification_channels` following project convention

---

## Out of Scope

- **User timezone support** - `notify_time` is compared against UTC. Per-user timezone configuration is a separate feature that should be tracked in its own issue. Until then, users set `notify_time` in UTC themselves.
- **Email notifications** - Already planned in Epic 3; not covered here.
- **In-app notification center and browser push** - Already planned in Epic 3; not covered here.
- **SMS notifications** - Excluded in Epic 3 and out of scope here.
- **Retry logic for failed deliveries** - If a message fails to deliver, the failure is logged. Building a retry queue would require a jobs table or external queue and is not in scope for this issue.
- **Encryption of stored credentials at the application layer** - Credentials are stored in plaintext columns. Encryption at rest is a system-level concern (disk encryption, PostgreSQL TDE). Application-layer column encryption can be added in a follow-up.
- **Rich formatting (Markdown, Discord embeds)** - Plain text only for the initial implementation. Telegram Markdown and Discord embeds can be added in a follow-up without schema changes.
- **Per-friend notification opt-out** - The digest includes all friends with upcoming dates in the window. Excluding specific friends from bot notifications is a future refinement.
- **Slack and other messaging platforms** - Telegram, Matrix, and Discord cover the most common self-hoster use cases. Adding more platforms later is straightforward: extend the `platform` CHECK constraint, add a new client file, and add the credential columns.
- **Notification history** - No log of sent notifications is persisted. This is intentional to keep the feature simple; a history view can be added later.

---

## Dependencies

- `friends.friend_dates` table and `GetUpcomingDates` PgTyped query already exist and require no changes
- `node-cron` is already installed and in use in the scheduler; no new dependency needed
- `system` PostgreSQL schema must exist; it is created in Epic 0 migrations
- Native `fetch` is available in Node 24+; no new HTTP client library is needed
- This issue does not depend on Epic 3 being fully implemented first. It can be built as a standalone feature, and Epic 3 will reuse the `system.notification_channels` table when it adds the full reminder system

---

## Related Epics and Issues

- [Epic 3: Reminder System](../epics/epic-03-planned-reminder-system.md) - This issue implements the messaging bot subset of Epic 3's planned notification channels
- [Epic 5: Multi-User Management](../epics/epic-05-done-multi-user-management.md) - Authentication infrastructure this issue builds on top of
- [Epic 9: Dashboard & Insights](../epics/epic-09-planned-dashboard-insights.md) - The upcoming dates data surfaced here is also a good candidate for a dashboard widget
