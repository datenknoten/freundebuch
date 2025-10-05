# Epic 3: Reminder System

**Status:** Planned
**Phase:** Core Functionality (Phase 2)
**Priority:** High

## Overview

Proactive support for contact maintenance through intelligent reminders. This feature helps users stay connected by notifying them when it's time to reach out to someone.

## Goals

- Automate reminder generation based on contact patterns
- Support manual reminder creation for specific follow-ups
- Provide flexible notification channels
- Enable users to manage and customize reminder behavior

## Key Features

### Automatic Reminders
- "Person X not contacted for Y days/weeks"
- Configurable thresholds per contact or group
  - Default threshold (e.g., 30 days)
  - Per-contact custom thresholds
  - Group-based thresholds (e.g., family: 7 days, colleagues: 90 days)
- Birthday reminders with configurable lead time (e.g., 3 days before)
- Anniversary reminders
- Smart suggestion of reminder intervals based on past interaction frequency

### Manual Reminders
- "Contact X again on [specific date]"
- Recurring reminders (daily, weekly, monthly, yearly)
- Custom reminder messages/notes
- One-time vs. recurring configuration

### Reminder Channels
- In-app notifications (badge count, notification center)
- Email notifications (daily digest or immediate)
- Browser push notifications (optional, with user permission)
- Configurable per-channel preferences

### Reminder Management
- Snooze functionality (1 day, 3 days, 1 week, custom)
- Dismiss reminders
- Mark as complete (optionally log interaction)
- Bulk actions on multiple reminders
- Reminder priority levels (high, normal, low)

## User Stories

1. As a user, I want to be reminded when I haven't contacted someone in a while so I don't lose touch
2. As a user, I want to set custom reminder intervals for important relationships so I can maintain regular contact
3. As a user, I want to receive birthday reminders in advance so I have time to prepare
4. As a user, I want to snooze reminders so I can postpone them to a more convenient time
5. As a user, I want to choose how I receive reminders so they fit my workflow
6. As a user, I want to create one-time reminders for specific follow-ups so I remember important commitments

## Technical Considerations

### Database Schema
- `reminders` table with contact_id, type, date, recurring, threshold, status
- `reminder_settings` for user preferences
- `notification_channels` for channel configuration
- Indexes on due_date for efficient querying

### Background Jobs
- Scheduled job to check for due reminders (every hour or daily)
- Email digest generator (configurable time)
- Birthday/anniversary checker (daily)
- Automatic reminder generator based on last interaction date

### API Endpoints
- `GET /api/reminders` - Get all reminders with filtering
- `GET /api/reminders/due` - Get currently due reminders
- `POST /api/reminders` - Create manual reminder
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder
- `POST /api/reminders/:id/snooze` - Snooze reminder
- `POST /api/reminders/:id/dismiss` - Dismiss reminder
- `POST /api/reminders/:id/complete` - Mark as complete
- `GET /api/contacts/:id/reminder-settings` - Get reminder settings for contact
- `PUT /api/contacts/:id/reminder-settings` - Update reminder settings

### Frontend Components
- Reminder list/dashboard
- Reminder creation form
- Reminder settings panel
- Notification badge/counter
- Snooze/dismiss action buttons
- Notification preferences page
- Reminder calendar view

### Email Templates
- Daily digest template
- Individual reminder template
- Birthday reminder template

## Success Metrics

- Reminders generated accurately based on interaction history
- Notifications delivered reliably across all enabled channels
- Users can easily snooze, dismiss, or complete reminders
- Email delivery rate >95%
- Reminder threshold customization works correctly

## Dependencies

- Epic 2: Relationship Management (for interaction-based reminders)
- Email service (SMTP configuration)
- Background job scheduler (node-cron or similar)
- Push notification service (optional)

## Out of Scope

- SMS notifications
- Integration with calendar apps (CalDAV comes in Phase 3)
- AI-powered reminder suggestions
- Reminder templates library

## Related Epics

- Epic 2: Relationship Management (provides interaction data)
- Epic 6: CalDAV/CardDAV Interface (calendar integration)
- Epic 9: Dashboard & Insights (displays reminder overview)
