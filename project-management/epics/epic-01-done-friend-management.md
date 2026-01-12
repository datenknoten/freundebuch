# Epic 1: Friend Management

**Status:** Done
**Phase:** MVP (Phase 1)
**Priority:** Critical
**GitHub Issue:** [#3](https://github.com/enko/freundebuch2/issues/3)

## Overview

This is the foundation of your Freundebuch - a comprehensive friend database that goes beyond what standard address books offer. We're building a central hub for all your friend information, designed to capture the details that actually matter for maintaining meaningful relationships.

## Sub-Epic Structure

This epic is divided into sub-epics to allow incremental delivery:

| Sub-Epic | Title | MVP Priority | Description | Status |
|----------|-------|--------------|-------------|--------|
| [1A](#epic-1a-core-friend-crud) | Core Friend CRUD | Critical | Basic friend management - the foundation | Done |
| [1B](#epic-1b-extended-friend-fields) | Extended Friend Fields | High | Rich context: dates, profession, social profiles | Done |
| 1C | Friend Notes | High | Timestamped notes system | Extracted to [Epic 15](epic-15-planned-friend-notes.md) |
| [1D](#epic-1d-friend-relationships) | Friend Relationships | Medium | Links between friends | Done |

**Recommended Implementation Order:** 1A → 1B → 1C → 1D

> **Note:** Custom fields have been extracted to [Epic 11: Custom Fields](epic-11-planned-custom-fields.md) for Phase 2.
> **Note:** Friend Notes (1C) has been extracted to [Epic 15: Friend Notes](epic-15-planned-friend-notes.md).

---

## Goals

- Build a comprehensive friend database that stores more than just names and numbers
- Capture rich context about your relationships that helps you remember people
- Support multiple communication channels per friend
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
| related | RELATED | Friend relationships |

---

# Epic 1A: Core Friend CRUD

**Priority:** Critical - Must be completed first

## Features

### Friend Fields (Required)
- **Display Name** - The primary name shown in lists (auto-generated or user-specified)

### Friend Fields (Optional)
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

### Friend List View
- Paginated list (default 25, configurable: 25/50/100)
- Sort by: display name (A-Z, Z-A), created date, modified date
- Show: avatar thumbnail, display name, primary email, primary phone
- Empty state for new users

### Friend Detail View
- Full friend information display
- Edit/Delete actions
- Tabbed or sectioned layout for different field groups

### Friend Create/Edit Form
- Validation with clear error messages
- Dynamic add/remove for multi-value fields (phones, emails, etc.)
- Unsaved changes warning
- Profile picture upload with preview

### Soft Delete
- Friends are soft-deleted (marked as `deleted_at` timestamp)
- Soft-deleted friends are hidden from normal views
- Hard delete available from admin/settings (future consideration)

## User Stories

1. As a user, I want to create a new friend with just a name so I can quickly add someone
2. As a user, I want to add multiple phone numbers with labels so I know which number to use
3. As a user, I want to add multiple email addresses so I can reach friends at different addresses
4. As a user, I want to view a friend's full details on a dedicated page
5. As a user, I want to edit any friend field after creation
6. As a user, I want to delete a friend I no longer need
7. As a user, I want to upload a profile picture so I can recognize friends visually
8. As a user, I want to see a paginated list of all my friends

## Database Schema

```sql
-- Core friends table
CREATE TABLE friends (
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
    CONSTRAINT friends_display_name_not_empty CHECK (LENGTH(TRIM(display_name)) > 0)
);

CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_display_name ON friends(user_id, display_name);
CREATE INDEX idx_friends_deleted_at ON friends(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_friends_created_at ON friends(user_id, created_at DESC);

-- Phone numbers
CREATE TABLE friend_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,

    phone_number VARCHAR(50) NOT NULL,  -- Stored in E.164 format
    phone_type VARCHAR(20) NOT NULL DEFAULT 'mobile',  -- mobile, home, work, fax, other
    label VARCHAR(100),  -- User-defined label
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_phone_type CHECK (phone_type IN ('mobile', 'home', 'work', 'fax', 'other'))
);

CREATE INDEX idx_friend_phones_friend_id ON friend_phones(friend_id);

-- Email addresses
CREATE TABLE friend_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,

    email_address VARCHAR(255) NOT NULL,
    email_type VARCHAR(20) NOT NULL DEFAULT 'personal',  -- personal, work, other
    label VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_email_type CHECK (email_type IN ('personal', 'work', 'other')),
    CONSTRAINT valid_email_format CHECK (email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_friend_emails_friend_id ON friend_emails(friend_id);
CREATE INDEX idx_friend_emails_address ON friend_emails(email_address);

-- Postal addresses
CREATE TABLE friend_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,

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

CREATE INDEX idx_friend_addresses_friend_id ON friend_addresses(friend_id);

-- URLs/Websites
CREATE TABLE friend_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,

    url VARCHAR(500) NOT NULL,
    url_type VARCHAR(20) NOT NULL DEFAULT 'personal',  -- personal, work, blog, other
    label VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_url_type CHECK (url_type IN ('personal', 'work', 'blog', 'other'))
);

CREATE INDEX idx_friend_urls_friend_id ON friend_urls(friend_id);
```

## API Endpoints

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | List friends with pagination, sorting |
| GET | `/api/friends/:id` | Get single friend with all related data |
| POST | `/api/friends` | Create new friend |
| PUT | `/api/friends/:id` | Update friend |
| DELETE | `/api/friends/:id` | Soft-delete friend |

### Phone Numbers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/:id/phones` | Add phone number |
| PUT | `/api/friends/:id/phones/:phoneId` | Update phone number |
| DELETE | `/api/friends/:id/phones/:phoneId` | Remove phone number |

### Email Addresses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/:id/emails` | Add email address |
| PUT | `/api/friends/:id/emails/:emailId` | Update email address |
| DELETE | `/api/friends/:id/emails/:emailId` | Remove email address |

### Postal Addresses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/:id/addresses` | Add address |
| PUT | `/api/friends/:id/addresses/:addressId` | Update address |
| DELETE | `/api/friends/:id/addresses/:addressId` | Remove address |

### URLs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/:id/urls` | Add URL |
| PUT | `/api/friends/:id/urls/:urlId` | Update URL |
| DELETE | `/api/friends/:id/urls/:urlId` | Remove URL |

### Profile Picture
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/:id/photo` | Upload profile picture |
| DELETE | `/api/friends/:id/photo` | Remove profile picture |

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

// Friend create schema
export const friendCreateSchema = type({
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

// Friend update schema (all fields optional)
export const friendUpdateSchema = type({
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
| `FriendList` | Paginated list with sorting, empty state |
| `FriendListItem` | Single row/card in list (avatar, name, primary friend info) |
| `FriendDetail` | Full friend view with all fields |
| `FriendForm` | Create/edit form with validation |
| `PhoneInput` | Phone number input with type selector |
| `EmailInput` | Email input with type selector |
| `AddressInput` | Structured address input |
| `UrlInput` | URL input with type selector |
| `MultiValueField` | Reusable add/remove pattern for multi-value fields |
| `AvatarUpload` | Profile picture upload with preview and crop |
| `FriendAvatar` | Display component with fallback initials |

## Success Metrics

- Friend list loads in <500ms for up to 1,000 friends
- Single friend API response in <100ms
- Friend create/update API response in <200ms
- Image upload completes in <3s for 5MB file
- All forms have <100ms validation feedback
- Test coverage >80%

---

# Epic 1B: Extended Friend Fields

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
CREATE TABLE friend_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,

    date_value DATE NOT NULL,
    year_known BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE if only month/day known
    date_type VARCHAR(30) NOT NULL,  -- birthday, anniversary, other
    label VARCHAR(100),  -- User label for 'other' type

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_date_type CHECK (date_type IN ('birthday', 'anniversary', 'other'))
);

CREATE INDEX idx_friend_dates_friend_id ON friend_dates(friend_id);
CREATE INDEX idx_friend_dates_upcoming ON friend_dates(
    EXTRACT(MONTH FROM date_value),
    EXTRACT(DAY FROM date_value)
);

-- How/where met
CREATE TABLE friend_met_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,

    met_date DATE,
    met_location VARCHAR(255),
    met_context TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT one_met_info_per_friend UNIQUE (friend_id)
);

-- Professional information (added to friends table)
ALTER TABLE friends ADD COLUMN job_title VARCHAR(100);
ALTER TABLE friends ADD COLUMN organization VARCHAR(255);
ALTER TABLE friends ADD COLUMN department VARCHAR(100);
ALTER TABLE friends ADD COLUMN work_notes TEXT;

-- Interests/hobbies (simple text for now, could be normalized later)
ALTER TABLE friends ADD COLUMN interests TEXT;

-- Social media profiles
CREATE TABLE friend_social_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,

    platform VARCHAR(30) NOT NULL,  -- linkedin, twitter, facebook, instagram, github, other
    profile_url VARCHAR(500),
    username VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_platform CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'github', 'other')),
    CONSTRAINT url_or_username CHECK (profile_url IS NOT NULL OR username IS NOT NULL)
);

CREATE INDEX idx_friend_social_profiles_friend_id ON friend_social_profiles(friend_id);
```

## API Endpoints

### Important Dates
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/:id/dates` | Add important date |
| PUT | `/api/friends/:id/dates/:dateId` | Update date |
| DELETE | `/api/friends/:id/dates/:dateId` | Remove date |

### Met Information
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/friends/:id/met-info` | Set/update met information |
| DELETE | `/api/friends/:id/met-info` | Remove met information |

### Social Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/:id/social-profiles` | Add social profile |
| PUT | `/api/friends/:id/social-profiles/:profileId` | Update social profile |
| DELETE | `/api/friends/:id/social-profiles/:profileId` | Remove social profile |

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

---

> **Note:** Epic 1C (Friend Notes) has been extracted to [Epic 15: Friend Notes](epic-15-planned-friend-notes.md).

---

# Epic 1D: Friend Relationships

**Priority:** Medium
**Depends on:** Epic 1A

## Features

### Relationship Definitions
- Define relationships between two friends
- Relationship types:
  - Family: spouse/partner, parent, child, sibling, grandparent, grandchild, cousin, in-law, other family
  - Professional: colleague, manager, report, mentor, mentee, client, other professional
  - Social: friend, neighbor, acquaintance, other
- Relationships are bidirectional with appropriate labels
  - e.g., "John is parent of Jane" automatically creates "Jane is child of John"
- Optional relationship notes

### Relationship Display
- Show related friends on friend detail page
- Link to related friend's detail page
- Group by relationship type

### Deferred to Phase 2
- Relationship graph visualization
- Relationship strength indicators

## User Stories

1. As a user, I want to mark that two friends are married so I remember their connection
2. As a user, I want to see all family members of a friend grouped together
3. As a user, I want to record that someone is a colleague of another friend
4. As a user, I want to navigate from one friend to their related friends

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

-- Friend relationships
CREATE TABLE friend_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
    related_friend_id UUID NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
    relationship_type_id VARCHAR(50) NOT NULL REFERENCES relationship_types(id),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate relationships
    CONSTRAINT unique_relationship UNIQUE (friend_id, related_friend_id, relationship_type_id),
    -- Prevent self-relationships
    CONSTRAINT no_self_relationship CHECK (friend_id != related_friend_id)
);

CREATE INDEX idx_friend_relationships_friend ON friend_relationships(friend_id);
CREATE INDEX idx_friend_relationships_related ON friend_relationships(related_friend_id);
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends/:id/relationships` | Get all relationships for friend |
| POST | `/api/friends/:id/relationships` | Create relationship (auto-creates inverse) |
| PUT | `/api/friends/:id/relationships/:relId` | Update relationship notes |
| DELETE | `/api/friends/:id/relationships/:relId` | Delete relationship (and inverse) |
| GET | `/api/relationship-types` | List available relationship types |

## Frontend Components

| Component | Description |
|-----------|-------------|
| `RelationshipsList` | Grouped list of related friends |
| `RelationshipItem` | Single relationship with link to friend |
| `AddRelationshipForm` | Friend picker + relationship type selector |
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

- **Epic 2:** Relationship Management - logs interactions with friends
- **Epic 4:** Categorization & Organization - groups, tags, favorites, archiving
- **Epic 5:** Multi-User Management - user authentication, sharing
- **Epic 6:** CalDAV/CardDAV - sync with external systems
- **Epic 7:** Import/Export - bulk data operations
- **Epic 10:** Search - finding friends
- **Epic 11:** Custom Fields - user-defined friend fields (Phase 2)

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
- Friend CRUD flow
- Multi-value field add/remove
- Profile picture upload
- Form validation feedback

### Performance Tests
- Friend list with 10,000 friends
- Friend with 50 phone numbers (edge case)
- Concurrent API requests
