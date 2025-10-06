# Epic 6: CalDAV/CardDAV Interface

**Status:** Planned
**Phase:** Integration & Polish (Phase 3)
**Priority:** Medium
**GitHub Issue:** [#8](https://github.com/enko/freundebuch2/issues/8)

## Overview

Want to access your contacts on your phone and other devices? This feature provides standards-compliant CalDAV and CardDAV interfaces so you can seamlessly sync with smartphones, desktop apps, and all your favorite tools.

## Goals

- Set up a standards-compliant CardDAV server so your contacts sync everywhere
- Add a CalDAV server for birthdays and reminders to show up in your calendar
- Make sure two-way sync works smoothly with all the popular apps you already use
- Handle sync conflicts gracefully (because they'll happen)
- Keep your data safe and intact across all sync operations

## Key Features

### CardDAV Implementation
- Full vCard 4.0 support (RFC 6350)
- Synchronization of contacts with:
  - Smartphone address books (iOS Contacts, Android Contacts)
  - Desktop applications (Thunderbird, Outlook, macOS Contacts)
  - Other CardDAV clients
- Bidirectional synchronization
  - Changes in Personal CRM sync to clients
  - Changes in clients sync to Personal CRM
- Conflict detection and resolution
- Incremental sync (only changed contacts)
- Multiple address book support (e.g., personal, shared)

### CalDAV Implementation
- iCalendar support (RFC 5545)
- Synchronization of:
  - **Birthdays calendar:** Contact birthdays as recurring events
  - **Reminders calendar:** Reminders as tasks/todos (VTODO)
  - **Interactions calendar (optional):** Past interactions as events
- Multiple calendar support
- Recurring event support
- Alarm/notification support
- Todo/task support (VTODO)

### vCard Mapping
- Standard fields mapping (N, FN, TEL, EMAIL, ADR, etc.)
- Extended fields mapping to vCard extensions
- Photo/avatar support (PHOTO property)
- Birthday mapping (BDAY property)
- Note mapping (NOTE property)
- Category/group mapping (CATEGORIES property)
- Custom field mapping (X- properties)

### Authentication & Security
- HTTP Basic Authentication
- OAuth 2.0 support (optional)
- App-specific passwords
- Per-client access tokens
- SSL/TLS required
- Authorization rules (personal vs. shared contacts)

### Sync Management
- Sync token/ETag support for efficient syncing
- Change tracking (create, update, delete)
- Conflict resolution strategies
- Sync history/log
- Manual sync trigger
- Sync status indicators

## User Stories

1. As a user, I want to sync my contacts to my iPhone so I can access them natively
2. As a user, I want changes I make on my phone to sync back to Personal CRM
3. As a user, I want my contact birthdays to appear in my calendar app automatically
4. As a user, I want to sync reminders to my todo app so I can manage them there
5. As a user, I want multiple devices to stay in sync without conflicts
6. As a user, I want to configure which address books sync to which devices
7. As a user, I want to use Thunderbird to manage my contacts with full two-way sync

## Technical Considerations

### Standards Compliance
- RFC 6350 (vCard 4.0)
- RFC 5545 (iCalendar)
- RFC 4918 (WebDAV)
- RFC 6352 (CardDAV)
- RFC 4791 (CalDAV)
- RFC 6578 (Collection Synchronization for WebDAV)

### Technology Stack
- CardDAV/CalDAV server library for Node.js
  - Consider: `@fysh/caldav-server` or similar
  - May need to build custom implementation
- vCard parser/generator
- iCalendar parser/generator
- WebDAV middleware

### Database Schema
- `carddav_addressbooks` table with name, user_id, workspace_id
- `caldav_calendars` table with name, type, user_id
- `sync_tokens` table for tracking sync state
- `carddav_changes` log for change tracking
- `caldav_changes` log for calendar changes
- `client_connections` for tracking connected clients

### API Endpoints

#### CardDAV
- `PROPFIND /.well-known/carddav` - Service discovery
- `PROPFIND /carddav/` - Addressbook discovery
- `PROPFIND /carddav/{addressbook}/` - Contact list
- `GET /carddav/{addressbook}/{contact}.vcf` - Get vCard
- `PUT /carddav/{addressbook}/{contact}.vcf` - Create/update vCard
- `DELETE /carddav/{addressbook}/{contact}.vcf` - Delete contact
- `REPORT /carddav/{addressbook}/` - Sync collection

#### CalDAV
- `PROPFIND /.well-known/caldav` - Service discovery
- `PROPFIND /caldav/` - Calendar discovery
- `PROPFIND /caldav/{calendar}/` - Event list
- `GET /caldav/{calendar}/{event}.ics` - Get event
- `PUT /caldav/{calendar}/{event}.ics` - Create/update event
- `DELETE /caldav/{calendar}/{event}.ics` - Delete event
- `REPORT /caldav/{calendar}/` - Calendar query

### Frontend Components
- CalDAV/CardDAV setup instructions
- Server URL display
- App-specific password generator
- Connection testing tool
- Connected clients list
- Sync status dashboard
- Conflict resolution interface
- Manual sync trigger button

### Testing Strategy
- Test with multiple clients:
  - iOS Contacts/Calendar
  - Android Contacts/Calendar
  - Thunderbird
  - macOS Contacts/Calendar
  - DAVx⁵ (Android)
- Automated integration tests
- Conflict scenario testing
- Performance testing with large contact sets

## Success Metrics

- Successful bidirectional sync with iOS
- Successful bidirectional sync with Android
- Successful bidirectional sync with Thunderbird
- Birthdays appear correctly in calendar apps
- Reminders sync as tasks/todos
- Conflicts resolved without data loss
- Sync completes in reasonable time (<10s for 1000 contacts)

## Dependencies

- WebDAV server implementation
- vCard/iCalendar parsing libraries
- Epic 1: Contact Management (contacts to sync)
- Epic 3: Reminder System (reminders to sync)
- SSL certificate for HTTPS

## Out of Scope

- GroupDAV protocol (sticking with the modern standards)
- SyncML protocol
- Proprietary sync protocols (Exchange ActiveSync, etc. - we're open standards all the way)
- Real-time push synchronization (we'll use polling instead, which works great)
- Automatic conflict resolution (you'll need to decide what to keep when conflicts happen)

## Related Epics

- Epic 1: Contact Management (source data)
- Epic 3: Reminder System (calendar integration)
- Epic 7: Import/Export (complementary data portability)

## Implementation Notes

### Phase 3A: CardDAV
1. Implement WebDAV foundation
2. Add CardDAV extensions
3. Implement vCard mapping
4. Test with major clients
5. Document setup procedures

### Phase 3B: CalDAV
1. Add CalDAV extensions to WebDAV
2. Implement birthday calendar
3. Implement reminder/todo calendar
4. Test with calendar clients
5. Optional: Implement interaction calendar

## Configuration Examples

### iOS Setup
1. Settings > Contacts > Accounts > Add Account > Other
2. Add CardDAV Account
3. Server: `crm.example.com`
4. Username: `user@example.com`
5. Password: `app-specific-password`

### Thunderbird Setup
1. Address Book > New > Remote Address Book
2. URL: `https://crm.example.com/carddav/addressbooks/username/default/`
3. Authentication: Basic Auth
