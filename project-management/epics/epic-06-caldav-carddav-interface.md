# Epic 6: CardDAV/CalDAV Interface

**Status:** Planned
**Phase:** Integration & Polish (Phase 3)
**Priority:** High
**GitHub Issue:** [#8](https://github.com/enko/freundebuch2/issues/8)

## Overview

Want to access your contacts on your phone and other devices? This feature provides standards-compliant CardDAV and CalDAV interfaces so you can seamlessly sync with smartphones, desktop apps, and all your favorite tools.

## Sub-Epic Structure

This epic is divided into sub-epics to allow incremental delivery:

| Sub-Epic | Title | Priority | Description |
|----------|-------|----------|-------------|
| [6A](#epic-6a-carddav-contact-sync) | CardDAV Contact Sync | Critical | Bidirectional contact synchronization |
| [6B](#epic-6b-caldav-birthdays-calendar) | CalDAV Birthdays Calendar | High | Birthday events in calendar apps |

**Recommended Implementation Order:** 6A → 6B

> **Note:** CalDAV reminders/tasks calendar is deferred until Epic 3 (Reminder System) is complete.

---

## Goals

- Set up a standards-compliant CardDAV server so your contacts sync everywhere
- Add a CalDAV server for birthdays to show up in your calendar
- Make sure two-way sync works smoothly with Thunderbird and iOS
- Handle sync conflicts gracefully (because they'll happen)
- Keep your data safe and intact across all sync operations

---

# Epic 6A: CardDAV Contact Sync

**Priority:** Critical - Must be completed first

## Features

### CardDAV Implementation
- Full vCard 4.0 support (RFC 6350)
- Synchronization of contacts with:
  - iOS Contacts (primary target)
  - Thunderbird (primary target)
  - Other CardDAV clients
- Bidirectional synchronization
  - Changes in Freundebuch sync to clients
  - Changes in clients sync to Freundebuch
- Conflict detection and resolution
- Incremental sync (only changed contacts)
- Single address book per user (simplicity first)

### vCard Mapping

The existing contact schema maps directly to vCard 4.0 properties:

| Freundebuch Field | vCard Property | Notes |
|-------------------|----------------|-------|
| `external_id` | UID | Unique identifier for sync |
| `display_name` | FN | Formatted name (required) |
| `name_prefix/first/middle/last/suffix` | N | Structured name |
| `phones` | TEL | With TYPE parameter (mobile, home, work, etc.) |
| `emails` | EMAIL | With TYPE parameter |
| `addresses` | ADR | Structured address with TYPE |
| `urls` | URL | With TYPE parameter |
| `photo_url` | PHOTO | Base64 encoded or URL reference |
| `birthday` (from contact_dates) | BDAY | Date with optional year |
| `anniversary` (from contact_dates) | ANNIVERSARY | |
| `job_title` | TITLE | |
| `organization` | ORG | |
| `social_profiles` | X-SOCIALPROFILE | Platform-specific |
| `interests` | X-INTERESTS | Custom extension |
| `met_info` | X-MET-DATE, X-MET-LOCATION, X-MET-CONTEXT | Custom extensions |

> **Note:** Contact notes (Epic 1C) are not yet implemented. Notes will not sync until that feature is complete.

### App-Specific Passwords

Since CardDAV uses HTTP Basic Authentication (not compatible with JWT sessions), we need app-specific passwords:

- Generate unique passwords for each connected app/device
- Passwords are hashed and stored securely
- User can view list of connected apps
- User can revoke individual app passwords
- Password naming for easy identification ("My iPhone", "Thunderbird Work")

### Authentication & Security
- HTTP Basic Authentication (required for CardDAV compatibility)
- App-specific passwords (generated per device/app)
- SSL/TLS required (HTTPS only)
- Rate limiting on authentication attempts

## User Stories

1. As a user, I want to generate an app-specific password so I can connect my iPhone
2. As a user, I want to sync my contacts to my iPhone so I can access them natively
3. As a user, I want changes I make on my phone to sync back to Freundebuch
4. As a user, I want to use Thunderbird to manage my contacts with full two-way sync
5. As a user, I want to see which devices are connected to my account
6. As a user, I want to revoke access for a device I no longer use

## Database Schema

```sql
-- App-specific passwords for CardDAV/CalDAV authentication
CREATE TABLE auth.app_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,  -- User-friendly name ("My iPhone")
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    password_prefix VARCHAR(8) NOT NULL,  -- First 8 chars for identification

    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,

    CONSTRAINT app_passwords_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_app_passwords_user_id ON auth.app_passwords(user_id);
CREATE INDEX idx_app_passwords_prefix ON auth.app_passwords(password_prefix);

-- Change tracking for incremental sync
CREATE TABLE contacts.contact_changes (
    id BIGSERIAL PRIMARY KEY,

    contact_id UUID NOT NULL,  -- May reference deleted contact
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    change_type VARCHAR(10) NOT NULL,  -- 'create', 'update', 'delete'
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- For deleted contacts, store the external_id since the contact row is gone
    contact_external_id UUID NOT NULL,

    CONSTRAINT valid_change_type CHECK (change_type IN ('create', 'update', 'delete'))
);

CREATE INDEX idx_contact_changes_user_id ON contacts.contact_changes(user_id);
CREATE INDEX idx_contact_changes_changed_at ON contacts.contact_changes(user_id, changed_at);

-- Sync tokens for efficient synchronization
CREATE TABLE contacts.sync_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    token VARCHAR(100) NOT NULL UNIQUE,  -- Opaque token returned to client
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_change_id BIGINT NOT NULL REFERENCES contacts.contact_changes(id),

    CONSTRAINT one_token_per_user UNIQUE (user_id)
);

CREATE INDEX idx_sync_tokens_token ON contacts.sync_tokens(token);
```

### Change Tracking Triggers

```sql
-- Trigger function to log contact changes
CREATE OR REPLACE FUNCTION contacts.log_contact_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO contacts.contact_changes (contact_id, user_id, change_type, contact_external_id)
        VALUES (NEW.id, NEW.user_id, 'create', NEW.external_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if meaningful fields changed (not just updated_at)
        IF OLD.display_name IS DISTINCT FROM NEW.display_name
           OR OLD.name_prefix IS DISTINCT FROM NEW.name_prefix
           OR OLD.name_first IS DISTINCT FROM NEW.name_first
           OR OLD.name_middle IS DISTINCT FROM NEW.name_middle
           OR OLD.name_last IS DISTINCT FROM NEW.name_last
           OR OLD.name_suffix IS DISTINCT FROM NEW.name_suffix
           OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
           OR OLD.job_title IS DISTINCT FROM NEW.job_title
           OR OLD.organization IS DISTINCT FROM NEW.organization
           OR OLD.department IS DISTINCT FROM NEW.department
           OR OLD.interests IS DISTINCT FROM NEW.interests
           OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
        THEN
            INSERT INTO contacts.contact_changes (contact_id, user_id, change_type, contact_external_id)
            VALUES (NEW.id, NEW.user_id,
                    CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'delete' ELSE 'update' END,
                    NEW.external_id);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_change_trigger
    AFTER INSERT OR UPDATE ON contacts.contacts
    FOR EACH ROW EXECUTE FUNCTION contacts.log_contact_change();

-- Similar triggers needed for: contact_phones, contact_emails, contact_addresses,
-- contact_urls, contact_dates, contact_social_profiles, contact_met_info
-- These should insert 'update' changes referencing the parent contact_id
```

## API Endpoints

### App-Specific Passwords (REST API)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/app-passwords` | List all app passwords (without actual passwords) |
| POST | `/api/app-passwords` | Generate new app password (returns password once) |
| DELETE | `/api/app-passwords/:id` | Revoke app password |

### CardDAV Endpoints (WebDAV Protocol)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/.well-known/carddav` | Redirect to principal URL |
| PROPFIND | `/carddav/` | Principal discovery |
| PROPFIND | `/carddav/{username}/` | Address book home |
| PROPFIND | `/carddav/{username}/contacts/` | Address book (contact list) |
| GET | `/carddav/{username}/contacts/{external_id}.vcf` | Get single vCard |
| PUT | `/carddav/{username}/contacts/{external_id}.vcf` | Create/update contact |
| DELETE | `/carddav/{username}/contacts/{external_id}.vcf` | Delete contact |
| REPORT | `/carddav/{username}/contacts/` | Sync collection / addressbook-query |

## Frontend Components

| Component | Description |
|-----------|-------------|
| `AppPasswordsList` | List of connected apps with revoke buttons |
| `GenerateAppPassword` | Form to create new app password with name |
| `AppPasswordDisplay` | One-time display of generated password |
| `CardDAVSetupGuide` | Step-by-step instructions with server URL |
| `SyncStatus` | Last sync time, number of synced contacts |

## Success Metrics

- Successful bidirectional sync with iOS Contacts
- Successful bidirectional sync with Thunderbird
- Incremental sync works (only changed contacts transferred)
- App-specific passwords can be generated and revoked
- Conflicts detected and surfaced to user
- Sync completes in reasonable time (<10s for 1000 contacts)

---

# Epic 6B: CalDAV Birthdays Calendar

**Priority:** High
**Depends on:** Epic 6A (WebDAV foundation), Epic 1B (contact dates)

## Features

### CalDAV Implementation
- iCalendar support (RFC 5545)
- Read-only birthdays calendar (birthdays are managed in contacts)
- Recurring yearly events for each birthday
- Proper handling of birthdays without year (age not shown)
- Alarm/notification support (configurable reminder before birthday)

### Birthday Calendar Events
- One VEVENT per contact with birthday
- Recurring yearly (RRULE:FREQ=YEARLY)
- All-day events
- Summary: "{Contact Name}'s Birthday"
- Optional alarm (e.g., 1 day before)

## User Stories

1. As a user, I want my contact birthdays to appear in my iPhone Calendar automatically
2. As a user, I want to get notifications before someone's birthday
3. As a user, I want birthdays to show the person's age (when year is known)

## Database Schema

```sql
-- CalDAV calendar definitions
CREATE TABLE contacts.caldav_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    calendar_type VARCHAR(20) NOT NULL,  -- 'birthdays' (future: 'reminders')
    display_name VARCHAR(100) NOT NULL,
    color VARCHAR(7),  -- Hex color code

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_calendar_type CHECK (calendar_type IN ('birthdays')),
    CONSTRAINT one_calendar_per_type UNIQUE (user_id, calendar_type)
);

-- Calendar sync tokens (similar to contacts)
CREATE TABLE contacts.calendar_sync_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES contacts.caldav_calendars(id) ON DELETE CASCADE,

    token VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Points to latest contact_changes that affects birthdays
    last_sync_at TIMESTAMPTZ NOT NULL
);
```

## API Endpoints

### CalDAV Endpoints (WebDAV Protocol)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/.well-known/caldav` | Redirect to principal URL |
| PROPFIND | `/caldav/` | Principal discovery |
| PROPFIND | `/caldav/{username}/` | Calendar home |
| PROPFIND | `/caldav/{username}/birthdays/` | Birthdays calendar |
| GET | `/caldav/{username}/birthdays/{contact_external_id}.ics` | Get birthday event |
| REPORT | `/caldav/{username}/birthdays/` | Calendar query / sync |

> **Note:** PUT and DELETE are not supported for birthdays calendar - birthdays are managed through contact editing.

## Frontend Components

| Component | Description |
|-----------|-------------|
| `CalDAVSetupGuide` | Instructions for subscribing to birthday calendar |
| `BirthdayCalendarPreview` | Preview of upcoming birthdays |

## Success Metrics

- Birthdays appear correctly in iOS Calendar
- Birthdays appear correctly in Thunderbird Calendar
- Recurring yearly events work properly
- Notifications fire at configured time before birthday

---

## Technical Considerations

### Standards Compliance
- RFC 6350 (vCard 4.0)
- RFC 5545 (iCalendar)
- RFC 4918 (WebDAV)
- RFC 6352 (CardDAV)
- RFC 4791 (CalDAV)
- RFC 6578 (Collection Synchronization for WebDAV)

### Technology Stack
- **SabreDAV** - PHP-based CardDAV/CalDAV server (mature, standards-compliant, battle-tested in Nextcloud/ownCloud)
- **PHP Runtime** - Required for SabreDAV
- **Node.js to PHP Bridge** - Integration layer between Hono API and SabreDAV
  - Option A: `@aspect/php-js` or similar bridge library
  - Option B: Separate PHP process with HTTP communication
  - Option C: PHP-FPM with FastCGI
- **vcard4** or similar - vCard parser/generator for Node.js side processing
- **ical.js** - iCalendar parser/generator for Node.js side processing

### Architecture Options

**Option A: PHP Bridge (Recommended)**
```
Client → Hono API → PHP Bridge → SabreDAV → PostgreSQL
                         ↓
                   Uses existing DB
```

**Option B: Sidecar Process**
```
Client → nginx/Caddy → /api/* → Hono API → PostgreSQL
                     → /carddav/* → PHP-FPM → SabreDAV → PostgreSQL
                     → /caldav/*
```

### Testing Strategy
- **Primary test clients:**
  - iOS Contacts and Calendar (iPhone/iPad)
  - Thunderbird with CardBook extension
- **Secondary test clients (nice to have):**
  - macOS Contacts/Calendar
  - DAVx⁵ (Android)
- **Automated tests:**
  - Integration tests using tsdav client library
  - vCard parsing/generation tests
  - Sync token progression tests
  - Conflict scenario tests
- **Performance tests:**
  - Sync 1000 contacts in <10s
  - Incremental sync of 10 changes in <1s

---

## Dependencies

- Epic 1A: Core Contact CRUD ✅ (complete)
- Epic 1B: Extended Contact Fields ✅ (complete - birthdays available)
- SSL certificate for HTTPS
- PHP runtime for SabreDAV

## Out of Scope

- GroupDAV protocol (deprecated)
- SyncML protocol (deprecated)
- Proprietary sync protocols (Exchange ActiveSync, etc.)
- Real-time push synchronization (polling-based sync only)
- Automatic conflict resolution (user must decide)
- Multiple address books per user (single address book only)
- Contact notes sync (until Epic 1C is implemented)
- CalDAV reminders/tasks calendar (until Epic 3 is implemented)
- CalDAV interactions calendar (until Epic 2 is implemented)
- Android-specific testing (DAVx⁵ should work but not primary target)

## Related Epics

- Epic 1: Contact Management (source data for CardDAV)
- Epic 7: Import/Export (complementary data portability)

## Future Considerations (Post-MVP)

These features may be added after the core implementation:

- **Epic 3 dependency:** CalDAV reminders/tasks calendar (VTODO)
- **Epic 2 dependency:** CalDAV interactions calendar
- **Multiple address books:** Personal, work, shared
- **Contact groups:** vCard CATEGORIES → address book groups
- **Push notifications:** WebDAV PUSH for instant sync

---

## Configuration Examples

### iOS Setup (Contacts)
1. Settings → Contacts → Accounts → Add Account → Other
2. Add CardDAV Account
3. Server: `your-freundebuch-domain.com`
4. Username: `your-email@example.com`
5. Password: `[app-specific-password]`
6. Description: `Freundebuch`

### iOS Setup (Birthdays Calendar)
1. Settings → Calendar → Accounts → Add Account → Other
2. Add CalDAV Account
3. Server: `your-freundebuch-domain.com`
4. Username: `your-email@example.com`
5. Password: `[app-specific-password]`
6. Description: `Freundebuch Birthdays`

### Thunderbird Setup (CardBook Extension)
1. Install CardBook extension
2. Address Book → CardBook → New Address Book → Remote
3. Type: CardDAV
4. URL: `https://your-freundebuch-domain.com/carddav/username/contacts/`
5. Username: `your-email@example.com`
6. Password: `[app-specific-password]`

### Thunderbird Setup (Calendar)
1. Calendar → New Calendar → On the Network
2. Format: CalDAV
3. URL: `https://your-freundebuch-domain.com/caldav/username/birthdays/`
4. Username: `your-email@example.com`
5. Password: `[app-specific-password]`

---

## Implementation Checklist

### Epic 6A: CardDAV
- [ ] Set up PHP runtime and SabreDAV
- [ ] Implement Node.js ↔ PHP bridge
- [ ] Create app_passwords table and API
- [ ] Implement HTTP Basic Auth with app passwords
- [ ] Configure SabreDAV PDO backend for PostgreSQL
- [ ] Implement contact → vCard mapping
- [ ] Implement vCard → contact mapping
- [ ] Set up change tracking triggers
- [ ] Implement sync tokens
- [ ] Add `/.well-known/carddav` endpoint
- [ ] Test with Thunderbird CardBook
- [ ] Test with iOS Contacts
- [ ] Document setup procedures
- [ ] Build frontend for app password management

### Epic 6B: CalDAV Birthdays
- [ ] Extend SabreDAV config for CalDAV
- [ ] Implement birthday → VEVENT mapping
- [ ] Create read-only calendar backend
- [ ] Add `/.well-known/caldav` endpoint
- [ ] Test with Thunderbird Calendar
- [ ] Test with iOS Calendar
- [ ] Document setup procedures
