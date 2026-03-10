# Upcoming Dates Notifications via Messaging Bots

**Related Epic:** [Epic 3: Reminder System](../epics/epic-03-planned-reminder-system.md)
**Priority:** High

## Summary

Users should receive daily notifications about upcoming dates (birthdays, anniversaries, and custom dates) through messaging platforms they already use. This feature adds support for configuring **Telegram**, **Matrix**, and **Discord** bot accounts in the user settings, so freundebuch can send a daily summary of dates coming up in the near future.

Think of it as your personal assistant tapping you on the shoulder each morning: "Hey, just a heads up - Sarah's birthday is in 3 days!"

## Motivation

Staying on top of important dates for the people in your life shouldn't require checking the app every day. By sending notifications to platforms users already have open (Telegram, Matrix, Discord), we meet them where they are. A daily digest keeps things low-noise while making sure nothing slips through the cracks.

## Key Features

### 1. Bot Account Configuration (Settings)

Users can configure one or more notification channels in their profile settings. Each platform requires different credentials:

**Telegram**
- Bot token (obtained from @BotFather)
- Chat ID (the user's chat or a group chat)

**Matrix**
- Homeserver URL (e.g., `https://matrix.org`)
- Access token
- Room ID (e.g., `!roomid:matrix.org`)

**Discord**
- Webhook URL (from channel settings > Integrations > Webhooks)

Users should be able to:
- Add multiple notification channels (e.g., both Telegram and Discord)
- Enable/disable individual channels without deleting them
- Send a test notification to verify the configuration works
- Remove a configured channel

### 2. Daily Notification Job

A scheduled background job runs once per day (at a user-configurable time, defaulting to 08:00 in their timezone) and:

1. Queries all friends with dates falling within a configurable lookahead window (default: 7 days)
2. Groups dates by day
3. Formats a summary message
4. Sends it to all enabled notification channels for that user

If there are no upcoming dates within the window, no notification is sent (no "nothing coming up" spam).

### 3. Notification Message Format

The daily summary should be clear and scannable. Example:

```
Upcoming dates (next 7 days):

Today - March 10
  Birthday: Sarah Miller

In 2 days - March 12
  Anniversary: Tom & Lisa Johnson

In 5 days - March 15
  Birthday: Alex Chen (turns 30)
```

- Include the date type (birthday, anniversary, or custom label)
- Include the friend's name
- For birthdays where the year is known, include the age they are turning
- Sort by date (soonest first)

### 4. Notification Preferences

Add the following user preferences:

| Preference | Type | Default | Description |
|---|---|---|---|
| `notificationLookaheadDays` | number | `7` | How many days ahead to look for upcoming dates |
| `notificationTime` | string (HH:mm) | `"08:00"` | When to send the daily notification |
| `notificationTimezone` | string | `"UTC"` | User's timezone for scheduling |

## Technical Design

### Database Changes

New table in the `auth` schema:

```sql
CREATE TABLE auth.notification_channels (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('telegram', 'matrix', 'discord')),
    config JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_channels_user_id ON auth.notification_channels(user_id);
```

The `config` JSONB stores platform-specific credentials:

```typescript
// Telegram
{ botToken: string; chatId: string }

// Matrix
{ homeserverUrl: string; accessToken: string; roomId: string }

// Discord
{ webhookUrl: string }
```

Extend user preferences (JSONB in `auth.users.preferences`):

```typescript
interface UserPreferences {
    // ... existing preferences ...
    notificationLookaheadDays?: number;
    notificationTime?: string;    // HH:mm format
    notificationTimezone?: string; // IANA timezone
}
```

### API Endpoints

```
GET    /api/notification-channels          - List all channels for authenticated user
POST   /api/notification-channels          - Create a new channel
PATCH  /api/notification-channels/:id      - Update a channel (toggle enabled, update config)
DELETE /api/notification-channels/:id      - Remove a channel
POST   /api/notification-channels/:id/test - Send a test notification
```

### Backend Components

**Notification Service** (`src/services/notifications.service.ts`)
- Channel CRUD operations
- Message formatting logic
- Platform-specific sender implementations (Telegram API, Matrix client-server API, Discord webhooks)

**Notification Scheduler** (extend `src/utils/scheduler.ts`)
- Daily job that iterates over users with enabled notification channels
- Queries upcoming dates per user
- Formats and dispatches notifications
- Handles failures gracefully (log errors, don't block other users)

**Platform Clients** (`src/services/external/`)
- `telegram.client.ts` - Send messages via Telegram Bot API (`POST /bot<token>/sendMessage`)
- `matrix.client.ts` - Send messages via Matrix client-server API (`PUT /_matrix/client/v3/rooms/{roomId}/send/m.room.message/{txnId}`)
- `discord.client.ts` - Send messages via Discord webhook (`POST <webhookUrl>`)

### Frontend Components

**Notification Settings Section** (in profile page or dedicated settings tab)
- List of configured channels with enable/disable toggle
- "Add Channel" form with platform selector and platform-specific fields
- "Test" button per channel
- "Remove" button with confirmation

### Shared Schema

Add validation schemas in `packages/shared/` for:
- `NotificationChannelCreateSchema` (platform + config validation)
- `NotificationChannelUpdateSchema`
- Extended `UserPreferencesSchema` with notification preferences

## Acceptance Criteria

- [ ] Users can add, edit, enable/disable, and remove Telegram bot notification channels
- [ ] Users can add, edit, enable/disable, and remove Matrix bot notification channels
- [ ] Users can add, edit, enable/disable, and remove Discord webhook notification channels
- [ ] Users can send a test notification to verify their channel configuration
- [ ] A daily background job sends upcoming date summaries to all enabled channels
- [ ] Users can configure the lookahead window (how many days ahead to check)
- [ ] Users can configure what time of day they receive their notification
- [ ] Notifications include friend name, date type, and (when applicable) age
- [ ] No notification is sent when there are no upcoming dates in the window
- [ ] Errors in one channel do not prevent delivery to other channels
- [ ] Sensitive credentials (bot tokens, access tokens) are stored securely and never exposed in API responses
- [ ] All new UI strings are available in both English and German
- [ ] API endpoints are protected by authentication middleware

## Security Considerations

- Bot tokens and access tokens must be encrypted at rest or stored securely
- API responses for notification channels should redact sensitive fields (show only last 4 characters of tokens)
- Webhook URLs and tokens should be validated before saving
- Rate limiting on the test notification endpoint to prevent abuse

## Out of Scope

- Email notifications (covered separately in Epic 3)
- In-app notification center (covered separately in Epic 3)
- Push notifications (covered separately in Epic 3)
- SMS notifications
- Per-friend notification preferences (notify only for specific friends)
- Notification history/log UI

## Dependencies

- Existing `friends.friend_dates` table (already implemented)
- Existing user preferences system (already implemented)
- Existing scheduler infrastructure (already implemented)
- Network access to Telegram API, Matrix homeservers, and Discord webhooks from the server
