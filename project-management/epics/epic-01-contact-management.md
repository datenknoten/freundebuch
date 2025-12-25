# Epic 1: Contact Management

**Status:** Planned
**Phase:** MVP (Phase 1)
**Priority:** Critical
**GitHub Issue:** [#3](https://github.com/enko/freundebuch2/issues/3)

## Overview

This is the foundation of your Personal CRM - a comprehensive contact database that goes beyond what standard address books offer. We're building a central hub for all your contact information, designed to capture the details that actually matter for maintaining meaningful relationships.

## Sub-Epic Structure

This epic is divided into sub-epics to allow incremental delivery:

| Sub-Epic | Title | MVP Priority | Description |
|----------|-------|--------------|-------------|
| [1A](#epic-1a-core-contact-crud) | Core Contact CRUD | Critical | Basic contact management - the foundation |
| [1B](#epic-1b-extended-contact-fields) | Extended Contact Fields | High | Rich context: dates, profession, social profiles |
| [1C](#epic-1c-contact-notes) | Contact Notes | High | Timestamped notes system |
| [1D](#epic-1d-contact-relationships) | Contact Relationships | Medium | Links between contacts |

**Recommended Implementation Order:** 1A → 1B → 1C → 1D

> **Note:** Custom fields have been extracted to [Epic 11: Custom Fields](epic-11-custom-fields.md) for Phase 2.

---

## Goals

- Build a comprehensive contact database that stores more than just names and numbers
- Capture rich context about your relationships that helps you remember people
- Support multiple communication channels per contact
- Prepare the data model for future features (import/export, CalDAV/CardDAV sync)
- Maintain vCard 4.0 compatibility for future interoperability

---

## vCard 4.0 Compatibility

To ensure future compatibility with Epic 6 (CalDAV/CardDAV) and Epic 7 (Import/Export), our data model aligns with vCard 4.0 (RFC 6350) properties:

| Our Field | vCard Property | Notes |
|-----------|----------------|-------|
| name_prefix | N (honorific prefix) | Dr., Mr., Ms., etc. |
| name_first | N (given name) | |
| name_middle | N (additional names) | |
| name_last | N (family name) | |
| name_suffix | N (honorific suffix) | Jr., III, PhD, etc. |
| display_name | FN | Generated or user-specified |
| phones | TEL | With TYPE parameter |
| emails | EMAIL | With TYPE parameter |
| addresses | ADR | Structured address |
| urls | URL | |
| birthday | BDAY | |
| anniversary | ANNIVERSARY | |
| organization | ORG | |
| job_title | TITLE | |
| photo | PHOTO | |
| notes | NOTE | |
| categories | CATEGORIES | Maps to tags (Epic 4) |
| related | RELATED | Contact relationships |

---

# Epic 1A: Core Contact CRUD

**Priority:** Critical - Must be completed first

## Features

### Contact Fields (Required)
- **Display Name** - The primary name shown in lists (auto-generated or user-specified)

### Contact Fields (Optional)
- **Name Parts:**
  - Prefix (Dr., Mr., Ms., Prof., etc.)
  - First name
  - Middle name(s)
  - Last name
  - Suffix (Jr., Sr., III, PhD, etc.)
- **Phone Numbers** (multiple, each with):
  - Number (stored in E.164 format internally, displayed flexibly)
  - Type: mobile, home, work, fax, other
  - Label (user-defined, e.g., "Office direct line")
  - Primary flag
- **Email Addresses** (multiple, each with):
  - Address
  - Type: personal, work, other
  - Label
  - Primary flag
- **Postal Addresses** (multiple, each with):
  - Street (line 1, line 2)
  - City
  - State/Province
  - Postal code
  - Country
  - Type: home, work, other
  - Label
- **URLs/Websites** (multiple, each with):
  - URL
  - Type: personal, work, blog, other
  - Label
- **Profile Picture**
  - Upload from file
  - Supported formats: JPEG, PNG, WebP
  - Max size: 5MB
  - Stored as: original + thumbnail (200x200)

### Contact List View
- Paginated list (default 25, configurable: 25/50/100)
- Sort by: display name (A-Z, Z-A), created date, modified date
- Show: avatar thumbnail, display name, primary email, primary phone
- Empty state for new users

### Contact Detail View
- Full contact information display
- Edit/Delete actions
- Tabbed or sectioned layout for different field groups

### Contact Create/Edit Form
- Validation with clear error messages
- Dynamic add/remove for multi-value fields (phones, emails, etc.)
- Unsaved changes warning
- Profile picture upload with preview

### Soft Delete
- Contacts are soft-deleted (marked as `deleted_at` timestamp)
- Soft-deleted contacts are hidden from normal views
- Hard delete available from admin/settings (future consideration)

## User Stories

1. As a user, I want to create a new contact with just a name so I can quickly add someone
2. As a user, I want to add multiple phone numbers with labels so I know which number to use
3. As a user, I want to add multiple email addresses so I can reach contacts at different addresses
4. As a user, I want to view a contact's full details on a dedicated page
5. As a user, I want to edit any contact field after creation
6. As a user, I want to delete a contact I no longer need
7. As a user, I want to upload a profile picture so I can recognize contacts visually
8. As a user, I want to see a paginated list of all my contacts

## Database Schema

```sql
-- Core contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Name fields (all optional except display_name)
    display_name VARCHAR(255) NOT NULL,
    name_prefix VARCHAR(50),
    name_first VARCHAR(100),
    name_middle VARCHAR(100),
    name_last VARCHAR(100),
    name_suffix VARCHAR(50),

    -- Profile picture
    photo_url VARCHAR(500),
    photo_thumbnail_url VARCHAR(500),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,  -- Soft delete

    -- Indexes
    CONSTRAINT contacts_display_name_not_empty CHECK (LENGTH(TRIM(display_name)) > 0)
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_display_name ON contacts(user_id, display_name);
CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_created_at ON contacts(user_id, created_at DESC);

-- Phone numbers
CREATE TABLE contact_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    phone_number VARCHAR(50) NOT NULL,  -- Stored in E.164 format
    phone_type VARCHAR(20) NOT NULL DEFAULT 'mobile',  -- mobile, home, work, fax, other
    label VARCHAR(100),  -- User-defined label
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_phone_type CHECK (phone_type IN ('mobile', 'home', 'work', 'fax', 'other'))
);

CREATE INDEX idx_contact_phones_contact_id ON contact_phones(contact_id);

-- Email addresses
CREATE TABLE contact_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    email_address VARCHAR(255) NOT NULL,
    email_type VARCHAR(20) NOT NULL DEFAULT 'personal',  -- personal, work, other
    label VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_email_type CHECK (email_type IN ('personal', 'work', 'other')),
    CONSTRAINT valid_email_format CHECK (email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_contact_emails_contact_id ON contact_emails(contact_id);
CREATE INDEX idx_contact_emails_address ON contact_emails(email_address);

-- Postal addresses
CREATE TABLE contact_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    street_line1 VARCHAR(255),
    street_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),

    address_type VARCHAR(20) NOT NULL DEFAULT 'home',  -- home, work, other
    label VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_address_type CHECK (address_type IN ('home', 'work', 'other'))
);

CREATE INDEX idx_contact_addresses_contact_id ON contact_addresses(contact_id);

-- URLs/Websites
CREATE TABLE contact_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    url VARCHAR(500) NOT NULL,
    url_type VARCHAR(20) NOT NULL DEFAULT 'personal',  -- personal, work, blog, other
    label VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_url_type CHECK (url_type IN ('personal', 'work', 'blog', 'other'))
);

CREATE INDEX idx_contact_urls_contact_id ON contact_urls(contact_id);
```

## API Endpoints

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List contacts with pagination, sorting |
| GET | `/api/contacts/:id` | Get single contact with all related data |
| POST | `/api/contacts` | Create new contact |
| PUT | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Soft-delete contact |

### Phone Numbers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts/:id/phones` | Add phone number |
| PUT | `/api/contacts/:id/phones/:phoneId` | Update phone number |
| DELETE | `/api/contacts/:id/phones/:phoneId` | Remove phone number |

### Email Addresses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts/:id/emails` | Add email address |
| PUT | `/api/contacts/:id/emails/:emailId` | Update email address |
| DELETE | `/api/contacts/:id/emails/:emailId` | Remove email address |

### Postal Addresses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts/:id/addresses` | Add address |
| PUT | `/api/contacts/:id/addresses/:addressId` | Update address |
| DELETE | `/api/contacts/:id/addresses/:addressId` | Remove address |

### URLs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts/:id/urls` | Add URL |
| PUT | `/api/contacts/:id/urls/:urlId` | Update URL |
| DELETE | `/api/contacts/:id/urls/:urlId` | Remove URL |

### Profile Picture
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts/:id/photo` | Upload profile picture |
| DELETE | `/api/contacts/:id/photo` | Remove profile picture |

## ArkType Validation Schemas

```typescript
import { type } from 'arktype'

// Phone number schema
export const phoneSchema = type({
  phone_number: 'string > 0',
  phone_type: '"mobile" | "home" | "work" | "fax" | "other"',
  'label?': 'string',
  'is_primary?': 'boolean',
})

// Email schema
export const emailSchema = type({
  email_address: 'email',
  email_type: '"personal" | "work" | "other"',
  'label?': 'string',
  'is_primary?': 'boolean',
})

// Address schema
export const addressSchema = type({
  'street_line1?': 'string',
  'street_line2?': 'string',
  'city?': 'string',
  'state_province?': 'string',
  'postal_code?': 'string',
  'country?': 'string',
  address_type: '"home" | "work" | "other"',
  'label?': 'string',
  'is_primary?': 'boolean',
})

// URL schema
export const urlSchema = type({
  url: 'string.url',
  url_type: '"personal" | "work" | "blog" | "other"',
  'label?': 'string',
})

// Contact create schema
export const contactCreateSchema = type({
  display_name: 'string > 0',
  'name_prefix?': 'string',
  'name_first?': 'string',
  'name_middle?': 'string',
  'name_last?': 'string',
  'name_suffix?': 'string',
  'phones?': phoneSchema.array(),
  'emails?': emailSchema.array(),
  'addresses?': addressSchema.array(),
  'urls?': urlSchema.array(),
})

// Contact update schema (all fields optional)
export const contactUpdateSchema = type({
  'display_name?': 'string > 0',
  'name_prefix?': 'string | null',
  'name_first?': 'string | null',
  'name_middle?': 'string | null',
  'name_last?': 'string | null',
  'name_suffix?': 'string | null',
})
```

## Frontend Components

| Component | Description |
|-----------|-------------|
| `ContactList` | Paginated list with sorting, empty state |
| `ContactListItem` | Single row/card in list (avatar, name, primary contact info) |
| `ContactDetail` | Full contact view with all fields |
| `ContactForm` | Create/edit form with validation |
| `PhoneInput` | Phone number input with type selector |
| `EmailInput` | Email input with type selector |
| `AddressInput` | Structured address input |
| `UrlInput` | URL input with type selector |
| `MultiValueField` | Reusable add/remove pattern for multi-value fields |
| `AvatarUpload` | Profile picture upload with preview and crop |
| `ContactAvatar` | Display component with fallback initials |

## Success Metrics

- Contact list loads in <500ms for up to 1,000 contacts
- Single contact API response in <100ms
- Contact create/update API response in <200ms
- Image upload completes in <3s for 5MB file
- All forms have <100ms validation feedback
- Test coverage >80%

---

# Epic 1B: Extended Contact Fields

**Priority:** High
**Depends on:** Epic 1A

## Features

### Birthday & Important Dates
- Birthday (date only, year optional for privacy)
- Anniversary
- Other custom dates with labels

### How/Where Met
- Date met
- Location (free text)
- Context/circumstances (free text)
- Useful for remembering the origin of relationships

### Professional Information
- Job title
- Organization/Company
- Department
- Work notes

### Interests & Hobbies
- Free-form text or tag-like entries
- Helps find common ground for conversations

### Social Media Profiles
- Platform-specific profile links
- Supported platforms: LinkedIn, Twitter/X, Facebook, Instagram, GitHub, other
- Username or full URL

## User Stories

1. As a user, I want to record someone's birthday so I can wish them well
2. As a user, I want to remember how I met someone so I can recall our connection
3. As a user, I want to store someone's job information so I know their professional context
4. As a user, I want to note someone's hobbies so I can connect over shared interests
5. As a user, I want to link to someone's social profiles so I can find them online

## Database Schema

```sql
-- Important dates
CREATE TABLE contact_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    date_value DATE NOT NULL,
    year_known BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE if only month/day known
    date_type VARCHAR(30) NOT NULL,  -- birthday, anniversary, other
    label VARCHAR(100),  -- User label for 'other' type

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_date_type CHECK (date_type IN ('birthday', 'anniversary', 'other'))
);

CREATE INDEX idx_contact_dates_contact_id ON contact_dates(contact_id);
CREATE INDEX idx_contact_dates_upcoming ON contact_dates(
    EXTRACT(MONTH FROM date_value),
    EXTRACT(DAY FROM date_value)
);

-- How/where met
CREATE TABLE contact_met_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    met_date DATE,
    met_location VARCHAR(255),
    met_context TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT one_met_info_per_contact UNIQUE (contact_id)
);

-- Professional information (added to contacts table)
ALTER TABLE contacts ADD COLUMN job_title VARCHAR(100);
ALTER TABLE contacts ADD COLUMN organization VARCHAR(255);
ALTER TABLE contacts ADD COLUMN department VARCHAR(100);
ALTER TABLE contacts ADD COLUMN work_notes TEXT;

-- Interests/hobbies (simple text for now, could be normalized later)
ALTER TABLE contacts ADD COLUMN interests TEXT;

-- Social media profiles
CREATE TABLE contact_social_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    platform VARCHAR(30) NOT NULL,  -- linkedin, twitter, facebook, instagram, github, other
    profile_url VARCHAR(500),
    username VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_platform CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'github', 'other')),
    CONSTRAINT url_or_username CHECK (profile_url IS NOT NULL OR username IS NOT NULL)
);

CREATE INDEX idx_contact_social_profiles_contact_id ON contact_social_profiles(contact_id);
```

## API Endpoints

### Important Dates
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts/:id/dates` | Add important date |
| PUT | `/api/contacts/:id/dates/:dateId` | Update date |
| DELETE | `/api/contacts/:id/dates/:dateId` | Remove date |

### Met Information
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/contacts/:id/met-info` | Set/update met information |
| DELETE | `/api/contacts/:id/met-info` | Remove met information |

### Social Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contacts/:id/social-profiles` | Add social profile |
| PUT | `/api/contacts/:id/social-profiles/:profileId` | Update social profile |
| DELETE | `/api/contacts/:id/social-profiles/:profileId` | Remove social profile |

## Frontend Components

| Component | Description |
|-----------|-------------|
| `DateInput` | Date picker with optional year |
| `MetInfoSection` | How/where met form section |
| `ProfessionalInfoSection` | Job title, organization, department |
| `InterestsInput` | Text area or tag-like input |
| `SocialProfileInput` | Platform selector with URL/username |
| `SocialProfileIcon` | Platform-specific icon display |

## Success Metrics

- All extended fields save correctly
- Upcoming birthdays query returns in <100ms
- Social profile links open correctly

---

# Epic 1C: Contact Notes

**Priority:** High
**Depends on:** Epic 1A

## Features

### Notes System
- Add timestamped notes to any contact
- Plain text (rich text deferred to future enhancement)
- Edit existing notes
- Delete notes
- Notes displayed in reverse chronological order (newest first)
- Notes are searchable (basic substring search for MVP)

## User Stories

1. As a user, I want to add notes about a contact so I can remember important details
2. As a user, I want to see when I added each note so I have temporal context
3. As a user, I want to edit a note if I made a mistake
4. As a user, I want to delete a note I no longer need
5. As a user, I want to see notes in chronological order so I can follow the history

## Database Schema

```sql
CREATE TABLE contact_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Who wrote the note

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notes_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX idx_contact_notes_created_at ON contact_notes(contact_id, created_at DESC);

-- Full-text search index for notes (basic search)
CREATE INDEX idx_contact_notes_content_search ON contact_notes
    USING GIN (to_tsvector('english', content));
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts/:id/notes` | List notes for contact (paginated) |
| POST | `/api/contacts/:id/notes` | Add new note |
| PUT | `/api/contacts/:id/notes/:noteId` | Update note |
| DELETE | `/api/contacts/:id/notes/:noteId` | Delete note |

## Frontend Components

| Component | Description |
|-----------|-------------|
| `NotesList` | Chronological list of notes with timestamps |
| `NoteItem` | Single note display with edit/delete actions |
| `NoteForm` | Text area for adding/editing notes |
| `NotesSection` | Container for notes in contact detail view |

## Success Metrics

- Notes list loads in <200ms for 100 notes
- Note creation in <100ms
- Notes search returns results in <300ms

---

# Epic 1D: Contact Relationships

**Priority:** Medium
**Depends on:** Epic 1A

## Features

### Relationship Definitions
- Define relationships between two contacts
- Relationship types:
  - Family: spouse/partner, parent, child, sibling, grandparent, grandchild, cousin, in-law, other family
  - Professional: colleague, manager, report, mentor, mentee, client, other professional
  - Social: friend, neighbor, acquaintance, other
- Relationships are bidirectional with appropriate labels
  - e.g., "John is parent of Jane" automatically creates "Jane is child of John"
- Optional relationship notes

### Relationship Display
- Show related contacts on contact detail page
- Link to related contact's detail page
- Group by relationship type

### Deferred to Phase 2
- Relationship graph visualization
- Relationship strength indicators

## User Stories

1. As a user, I want to mark that two contacts are married so I remember their connection
2. As a user, I want to see all family members of a contact grouped together
3. As a user, I want to record that someone is a colleague of another contact
4. As a user, I want to navigate from one contact to their related contacts

## Database Schema

```sql
-- Relationship type definitions (reference table)
CREATE TABLE relationship_types (
    id VARCHAR(50) PRIMARY KEY,  -- e.g., 'spouse', 'parent', 'child'
    category VARCHAR(30) NOT NULL,  -- family, professional, social
    label VARCHAR(50) NOT NULL,  -- Display label
    inverse_type_id VARCHAR(50),  -- The inverse relationship

    CONSTRAINT valid_category CHECK (category IN ('family', 'professional', 'social'))
);

-- Seed relationship types
INSERT INTO relationship_types (id, category, label, inverse_type_id) VALUES
    ('spouse', 'family', 'Spouse/Partner', 'spouse'),
    ('parent', 'family', 'Parent', 'child'),
    ('child', 'family', 'Child', 'parent'),
    ('sibling', 'family', 'Sibling', 'sibling'),
    ('grandparent', 'family', 'Grandparent', 'grandchild'),
    ('grandchild', 'family', 'Grandchild', 'grandparent'),
    ('cousin', 'family', 'Cousin', 'cousin'),
    ('in_law', 'family', 'In-law', 'in_law'),
    ('other_family', 'family', 'Other Family', 'other_family'),
    ('colleague', 'professional', 'Colleague', 'colleague'),
    ('manager', 'professional', 'Manager', 'report'),
    ('report', 'professional', 'Direct Report', 'manager'),
    ('mentor', 'professional', 'Mentor', 'mentee'),
    ('mentee', 'professional', 'Mentee', 'mentor'),
    ('client', 'professional', 'Client', 'client'),
    ('other_professional', 'professional', 'Other Professional', 'other_professional'),
    ('friend', 'social', 'Friend', 'friend'),
    ('neighbor', 'social', 'Neighbor', 'neighbor'),
    ('acquaintance', 'social', 'Acquaintance', 'acquaintance'),
    ('other_social', 'social', 'Other', 'other_social');

-- Contact relationships
CREATE TABLE contact_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    related_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    relationship_type_id VARCHAR(50) NOT NULL REFERENCES relationship_types(id),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate relationships
    CONSTRAINT unique_relationship UNIQUE (contact_id, related_contact_id, relationship_type_id),
    -- Prevent self-relationships
    CONSTRAINT no_self_relationship CHECK (contact_id != related_contact_id)
);

CREATE INDEX idx_contact_relationships_contact ON contact_relationships(contact_id);
CREATE INDEX idx_contact_relationships_related ON contact_relationships(related_contact_id);
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts/:id/relationships` | Get all relationships for contact |
| POST | `/api/contacts/:id/relationships` | Create relationship (auto-creates inverse) |
| PUT | `/api/contacts/:id/relationships/:relId` | Update relationship notes |
| DELETE | `/api/contacts/:id/relationships/:relId` | Delete relationship (and inverse) |
| GET | `/api/relationship-types` | List available relationship types |

## Frontend Components

| Component | Description |
|-----------|-------------|
| `RelationshipsList` | Grouped list of related contacts |
| `RelationshipItem` | Single relationship with link to contact |
| `AddRelationshipForm` | Contact picker + relationship type selector |
| `RelationshipTypeSelect` | Grouped dropdown of relationship types |

## Success Metrics

- Relationships load in <100ms
- Creating relationship (with inverse) in <200ms
- Relationship types grouped logically in UI

---

## Dependencies

- **Epic 0:** Project setup complete (database, API framework, frontend)
- **Epic 5 (partial):** User authentication for `user_id` foreign keys
- **File storage:** For profile pictures (local filesystem for MVP, S3-compatible for production)

## Out of Scope (Handled by Other Epics)

| Feature | Epic |
|---------|------|
| Custom Fields | Epic 11: Custom Fields (Phase 2) |
| Groups & Tags | Epic 4: Categorization & Organization |
| Favorites | Epic 4: Categorization & Organization |
| Archiving | Epic 4: Categorization & Organization |
| Full-text search | Epic 10: Search Functionality |
| Bulk import/export | Epic 7: Import/Export |
| CalDAV/CardDAV sync | Epic 6: CalDAV/CardDAV Interface |
| Interaction logging | Epic 2: Relationship Management |

## Related Epics

- **Epic 2:** Relationship Management - logs interactions with contacts
- **Epic 4:** Categorization & Organization - groups, tags, favorites, archiving
- **Epic 5:** Multi-User Management - user authentication, sharing
- **Epic 6:** CalDAV/CardDAV - sync with external systems
- **Epic 7:** Import/Export - bulk data operations
- **Epic 10:** Search - finding contacts
- **Epic 11:** Custom Fields - user-defined contact fields (Phase 2)

## Testing Strategy

### Unit Tests
- Validation schema tests for all ArkType schemas
- Service layer tests for business logic
- Utility function tests (display name generation, phone formatting)

### Integration Tests
- API endpoint tests with test database
- Database constraint tests
- Cascade delete tests

### E2E Tests
- Contact CRUD flow
- Multi-value field add/remove
- Profile picture upload
- Form validation feedback

### Performance Tests
- Contact list with 10,000 contacts
- Contact with 50 phone numbers (edge case)
- Concurrent API requests
