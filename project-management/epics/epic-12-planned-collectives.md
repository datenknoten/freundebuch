# Epic 12: Collectives

**Status:** Planned
**Phase:** Phase 2
**Priority:** Medium
**Depends On:** Epic 1D (Contact Relationships)

## Overview

Collectives are entities that group contacts together - families, companies, clubs, or friend groups. When you add a contact to a collective with a specific role, relationships are automatically created based on that role and the collective type. This eliminates the tedious process of manually defining relationships between every pair of contacts in a group.

Think of it as: "Add Sarah as a child to the Smith Family, and automatically connect her as child to the parents and sibling to other children."

## Goals

- Provide a way to group related contacts under a named collective
- Automatically create relationships between members based on roles
- Support multiple collective types with customizable role definitions
- Allow contacts to belong to multiple collectives
- Track membership history (members can become inactive but history is preserved)

---

## Core Concepts

### Collective Types

Collectives have a type that determines what roles are available and what automatic relationships are created. Default types:

| Type | Description | Available Roles |
|------|-------------|-----------------|
| Family | A family unit | parent, child, spouse, grandparent, grandchild |
| Company | A business organization | owner, manager, employee |
| Club | Sports club, hackerspace, etc. | member |
| Friend Group | A social circle | member |

Users can create custom collective types with their own role definitions.

### Roles and Automatic Relationships

When a contact is added to a collective with a role, relationships are automatically created with existing members based on predefined rules:

#### Family Collective Rules

| New Member Role | Existing Member Role | Relationship Created |
|-----------------|---------------------|---------------------|
| child | parent | parent → child |
| child | child | sibling → sibling |
| child | grandparent | grandparent → grandchild |
| parent | child | parent → child |
| parent | parent | (no automatic relationship - could be spouse or co-parent) |
| parent | grandparent | parent → child |
| spouse | spouse | spouse → spouse |
| grandparent | child | grandparent → grandchild |
| grandparent | grandchild | grandparent → grandchild |
| grandchild | grandparent | grandparent → grandchild |

#### Company Collective Rules

| New Member Role | Existing Member Role | Relationship Created |
|-----------------|---------------------|---------------------|
| employee | employee | colleague → colleague |
| employee | manager | manager → report |
| employee | owner | (no automatic relationship) |
| manager | employee | manager → report |
| manager | manager | colleague → colleague |
| owner | (any) | (no automatic relationship) |

#### Club / Friend Group Rules

| New Member Role | Existing Member Role | Relationship Created |
|-----------------|---------------------|---------------------|
| member | member | friend → friend |

### Membership Lifecycle

Memberships are **never deleted** - they become inactive:

- **Active** - Current member of the collective
- **Inactive** - Former member (left the company, moved away, divorce, etc.)

Inactive memberships preserve history and the relationships that were created remain intact. This is important because:
- Someone who left a company still worked there at some point
- A divorce doesn't erase the history of being married
- A child who moves out is still part of the family

**Effect on auto-generated relationships:**
- When a membership becomes inactive, relationships with `source_membership_id` pointing to it are **not automatically deleted or modified**
- Users can manually delete these relationships if desired
- The relationship retains the `source_membership_id` reference for provenance tracking
- If the membership is reactivated, no new relationships are created (existing ones are still valid)

---

## Features

### Collective Management

- Create, edit, and view collectives
- Each collective has:
  - Name (e.g., "The Smith Family", "Acme Corp", "Weekend Hiking Group")
  - Type (Family, Company, Club, Friend Group, or custom)
  - Photo/avatar (optional)
  - Address (optional - family home, company HQ, club location)
  - Notes (optional)
  - Created date
- List all collectives with filtering by type
- View collective detail page showing all members

### Membership Management

- Add contact to collective with a role
- Change a member's role
- Mark membership as inactive (with optional reason/date)
- Reactivate inactive membership
- View membership history

### Automatic Relationship Creation

- When adding a member, automatically create relationships based on rules
- Show preview of relationships that will be created before confirming
- Allow user to skip automatic relationship creation if desired
- Relationships created this way are marked as "auto-generated from collective"

### Collective Type Management

- View all collective types (default + custom)
- Create custom collective types with:
  - Name
  - Available roles
  - Relationship rules (which role pairs create which relationships)
- Edit custom collective types
- Cannot delete collective types that have collectives using them

---

## User Stories

1. As a user, I want to create a "Family" collective so I can group my family contacts together
2. As a user, I want to add my children to the family collective and have parent-child relationships automatically created
3. As a user, I want to create a company collective for my workplace so colleagues are connected automatically
4. As a user, I want to mark someone as having left a company without losing the history that they worked there
5. As a user, I want to see all members of a collective on a single page
6. As a user, I want a contact to belong to multiple collectives (family and workplace)
7. As a user, I want to create a custom collective type for my book club with just "member" roles
8. As a user, I want to see which relationships were auto-created from collective membership

---

## Database Schema

**Note:** This schema uses PostgreSQL-specific features (partial unique constraints, `gen_random_uuid()`).

```sql
-- Create schema for collectives
CREATE SCHEMA IF NOT EXISTS collectives;

-- Collective types (reference table with defaults + user-created)
CREATE TABLE collectives.collective_types (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL for system defaults

    name TEXT NOT NULL,
    description TEXT,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_collective_type_name_per_user UNIQUE (user_id, name)
);

CREATE UNIQUE INDEX idx_collective_types_external_id ON collectives.collective_types(external_id);

-- Roles available for each collective type
CREATE TABLE collectives.collective_roles (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL DEFAULT gen_random_uuid(),

    collective_type_id INTEGER NOT NULL REFERENCES collectives.collective_types(id) ON DELETE CASCADE,

    role_key TEXT NOT NULL,  -- e.g., 'parent', 'child', 'employee'
    label TEXT NOT NULL,     -- e.g., 'Parent', 'Child', 'Employee'
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_role_per_type UNIQUE (collective_type_id, role_key)
);

CREATE UNIQUE INDEX idx_collective_roles_external_id ON collectives.collective_roles(external_id);

-- Rules for automatic relationship creation
CREATE TABLE collectives.collective_relationship_rules (
    id SERIAL PRIMARY KEY,

    collective_type_id INTEGER NOT NULL REFERENCES collectives.collective_types(id) ON DELETE CASCADE,

    -- When a member with this role is added...
    new_member_role_id INTEGER NOT NULL REFERENCES collectives.collective_roles(id) ON DELETE CASCADE,
    -- ...and there's an existing member with this role...
    existing_member_role_id INTEGER NOT NULL REFERENCES collectives.collective_roles(id) ON DELETE CASCADE,
    -- ...create this relationship type
    relationship_type_id TEXT NOT NULL REFERENCES contacts.relationship_types(id),
    -- Direction: which contact becomes the "from" in the relationship?
    -- 'new_member' = new member is from_contact, existing is to_contact
    -- 'existing_member' = existing member is from_contact, new is to_contact
    -- 'both' = create bidirectional (two relationships, one in each direction)
    relationship_direction TEXT NOT NULL DEFAULT 'new_member'
        CHECK (relationship_direction IN ('new_member', 'existing_member', 'both')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_rule UNIQUE (collective_type_id, new_member_role_id, existing_member_role_id)
);

-- Collectives (instances of collective types)
CREATE TABLE collectives.collectives (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- RESTRICT prevents deleting a collective type that has collectives using it
    collective_type_id INTEGER NOT NULL REFERENCES collectives.collective_types(id) ON DELETE RESTRICT,

    name TEXT NOT NULL,
    photo_url TEXT,
    photo_thumbnail_url TEXT,
    notes TEXT,

    -- Optional address
    address_street_line1 TEXT,
    address_street_line2 TEXT,
    address_city TEXT,
    address_state_province TEXT,
    address_postal_code TEXT,
    address_country TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,  -- Soft delete support

    CONSTRAINT collectives_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE UNIQUE INDEX idx_collectives_external_id ON collectives.collectives(external_id);
CREATE INDEX idx_collectives_user_id ON collectives.collectives(user_id);
CREATE INDEX idx_collectives_type_id ON collectives.collectives(collective_type_id);
CREATE INDEX idx_collectives_active ON collectives.collectives(user_id) WHERE deleted_at IS NULL;

-- Collective memberships (contacts belonging to collectives)
CREATE TABLE collectives.collective_memberships (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL DEFAULT gen_random_uuid(),

    collective_id INTEGER NOT NULL REFERENCES collectives.collectives(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES contacts.contacts(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES collectives.collective_roles(id),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    inactive_reason TEXT,
    inactive_date DATE,

    joined_date DATE,
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- A contact can only have one active membership per collective
    -- (but can have multiple inactive ones for history)
    CONSTRAINT unique_active_membership UNIQUE (collective_id, contact_id)
        WHERE (is_active = TRUE)
);

CREATE UNIQUE INDEX idx_collective_memberships_external_id ON collectives.collective_memberships(external_id);
CREATE INDEX idx_collective_memberships_collective_id ON collectives.collective_memberships(collective_id);
CREATE INDEX idx_collective_memberships_contact_id ON collectives.collective_memberships(contact_id);
CREATE INDEX idx_collective_memberships_active ON collectives.collective_memberships(collective_id, is_active)
    WHERE is_active = TRUE;

-- Track which relationships were auto-created from collective membership
-- (Added column to existing contact_relationships table)
ALTER TABLE contacts.contact_relationships
    ADD COLUMN source_membership_id INTEGER REFERENCES collectives.collective_memberships(id) ON DELETE SET NULL;

CREATE INDEX idx_contact_relationships_source_membership
    ON contacts.contact_relationships(source_membership_id)
    WHERE source_membership_id IS NOT NULL;
```

### Seed Data for Default Collective Types

```sql
-- Insert default collective types
INSERT INTO collectives.collective_types (name, description, is_system_default) VALUES
    ('Family', 'A family unit with parents, children, and extended family', TRUE),
    ('Company', 'A business organization with employees and management', TRUE),
    ('Club', 'A club, organization, or group like a sports club or hackerspace', TRUE),
    ('Friend Group', 'A social circle of friends', TRUE);

-- Insert roles for Family
INSERT INTO collectives.collective_roles (collective_type_id, role_key, label, sort_order)
SELECT id, role_key, label, sort_order FROM collectives.collective_types,
    (VALUES
        ('parent', 'Parent', 1),
        ('child', 'Child', 2),
        ('spouse', 'Spouse/Partner', 3),
        ('grandparent', 'Grandparent', 4),
        ('grandchild', 'Grandchild', 5)
    ) AS roles(role_key, label, sort_order)
WHERE name = 'Family';

-- Insert roles for Company
INSERT INTO collectives.collective_roles (collective_type_id, role_key, label, sort_order)
SELECT id, role_key, label, sort_order FROM collectives.collective_types,
    (VALUES
        ('owner', 'Owner/Founder', 1),
        ('manager', 'Manager', 2),
        ('employee', 'Employee', 3)
    ) AS roles(role_key, label, sort_order)
WHERE name = 'Company';

-- Insert roles for Club
INSERT INTO collectives.collective_roles (collective_type_id, role_key, label, sort_order)
SELECT id, role_key, label, sort_order FROM collectives.collective_types,
    (VALUES
        ('member', 'Member', 1)
    ) AS roles(role_key, label, sort_order)
WHERE name = 'Club';

-- Insert roles for Friend Group
INSERT INTO collectives.collective_roles (collective_type_id, role_key, label, sort_order)
SELECT id, role_key, label, sort_order FROM collectives.collective_types,
    (VALUES
        ('member', 'Member', 1)
    ) AS roles(role_key, label, sort_order)
WHERE name = 'Friend Group';

-- Insert relationship rules for Family
-- Uses subqueries to look up role IDs dynamically
INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
SELECT
    ct.id,
    nr.id,
    er.id,
    rules.relationship_type_id,
    rules.direction
FROM collectives.collective_types ct
CROSS JOIN (VALUES
    -- child + parent = parent → child (existing parent is "from", new child is "to")
    ('child', 'parent', 'parent_child', 'existing_member'),
    -- child + child = sibling ↔ sibling (bidirectional)
    ('child', 'child', 'sibling', 'both'),
    -- child + grandparent = grandparent → grandchild
    ('child', 'grandparent', 'grandparent_grandchild', 'existing_member'),
    -- parent + child = parent → child (new parent is "from", existing child is "to")
    ('parent', 'child', 'parent_child', 'new_member'),
    -- parent + grandparent = grandparent → parent (existing grandparent is "from")
    ('parent', 'grandparent', 'parent_child', 'existing_member'),
    -- spouse + spouse = spouse ↔ spouse (bidirectional)
    ('spouse', 'spouse', 'spouse', 'both'),
    -- grandparent + child = grandparent → grandchild
    ('grandparent', 'child', 'grandparent_grandchild', 'new_member'),
    -- grandparent + grandchild = grandparent → grandchild
    ('grandparent', 'grandchild', 'grandparent_grandchild', 'new_member'),
    -- grandchild + grandparent = grandparent → grandchild
    ('grandchild', 'grandparent', 'grandparent_grandchild', 'existing_member')
) AS rules(new_role, existing_role, relationship_type_id, direction)
JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = rules.new_role
JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = rules.existing_role
WHERE ct.name = 'Family';

-- Insert relationship rules for Company
INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
SELECT
    ct.id,
    nr.id,
    er.id,
    rules.relationship_type_id,
    rules.direction
FROM collectives.collective_types ct
CROSS JOIN (VALUES
    -- employee + employee = colleague ↔ colleague (bidirectional)
    ('employee', 'employee', 'colleague', 'both'),
    -- employee + manager = manager → report (existing manager is "from")
    ('employee', 'manager', 'manager_report', 'existing_member'),
    -- manager + employee = manager → report (new manager is "from")
    ('manager', 'employee', 'manager_report', 'new_member'),
    -- manager + manager = colleague ↔ colleague (bidirectional)
    ('manager', 'manager', 'colleague', 'both')
) AS rules(new_role, existing_role, relationship_type_id, direction)
JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = rules.new_role
JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = rules.existing_role
WHERE ct.name = 'Company';

-- Insert relationship rules for Club
INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
SELECT
    ct.id,
    nr.id,
    er.id,
    'friend',
    'both'
FROM collectives.collective_types ct
JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = 'member'
JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = 'member'
WHERE ct.name = 'Club';

-- Insert relationship rules for Friend Group
INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
SELECT
    ct.id,
    nr.id,
    er.id,
    'friend',
    'both'
FROM collectives.collective_types ct
JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = 'member'
JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = 'member'
WHERE ct.name = 'Friend Group';
```

---

## API Endpoints

**Note:** All `:id` parameters in endpoints refer to the `external_id` (UUID), not the internal database ID.

### Collective Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collective-types` | List all collective types (system + user's custom) |
| POST | `/api/collective-types` | Create custom collective type |
| GET | `/api/collective-types/:id` | Get collective type with roles and rules |
| PUT | `/api/collective-types/:id` | Update custom collective type |
| DELETE | `/api/collective-types/:id` | Delete custom collective type |

### Collectives
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collectives` | List all collectives (with optional type filter) |
| POST | `/api/collectives` | Create new collective |
| GET | `/api/collectives/:id` | Get collective with members |
| PUT | `/api/collectives/:id` | Update collective |
| DELETE | `/api/collectives/:id` | Soft delete collective |
| POST | `/api/collectives/:id/photo` | Upload collective photo |
| DELETE | `/api/collectives/:id/photo` | Remove collective photo |

### Memberships
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collectives/:id/members` | List members (active and/or inactive) |
| POST | `/api/collectives/:id/members` | Add member with role |
| GET | `/api/collectives/:id/members/:memberId` | Get membership details |
| PUT | `/api/collectives/:id/members/:memberId` | Update membership (role, notes) |
| POST | `/api/collectives/:id/members/:memberId/deactivate` | Mark member as inactive |
| POST | `/api/collectives/:id/members/:memberId/reactivate` | Reactivate member |

### Relationship Preview
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/collectives/:id/members/preview` | Preview relationships that would be created |

---

## Frontend Components

### Collective Management
| Component | Description |
|-----------|-------------|
| `CollectiveList` | List of all collectives with type badges |
| `CollectiveListItem` | Card showing collective name, type, member count |
| `CollectiveDetail` | Full collective view with member list |
| `CollectiveForm` | Create/edit collective form |
| `CollectiveAvatar` | Display collective photo or type icon fallback |
| `CollectiveTypeSelect` | Dropdown to select collective type |

### Membership Management
| Component | Description |
|-----------|-------------|
| `MemberList` | List of collective members with roles |
| `MemberListItem` | Member card with avatar, name, role, status |
| `AddMemberForm` | Contact search + role selection |
| `RelationshipPreview` | Shows relationships that will be created |
| `MembershipHistory` | Timeline of membership changes |
| `DeactivateMemberModal` | Form to mark member as inactive |

### Collective Type Management
| Component | Description |
|-----------|-------------|
| `CollectiveTypeList` | List of available types (system + custom) |
| `CollectiveTypeForm` | Create/edit custom type |
| `RoleEditor` | Manage roles for a collective type |
| `RelationshipRuleEditor` | Define relationship rules between roles |

---

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `g` then `o` | Global | Go to Collectives list |
| `n` | Collectives list | New collective |
| `m` | Collective detail | Add member |
| `e` | Collective detail | Edit collective |

---

## Success Metrics

- Collective list loads in <500ms for 100 collectives
- Adding a member with 10 auto-relationships created in <500ms
- Relationship preview calculates in <200ms
- All CRUD operations complete in <300ms

---

## Implementation Order

1. **Database Migration**
   - Create tables for collective types, roles, rules
   - Create tables for collectives and memberships
   - Add source_membership_id to contact_relationships
   - Seed default collective types with roles and rules

2. **Shared Types**
   - Add types for collective types, roles, rules
   - Add types for collectives and memberships
   - Add validation schemas

3. **Backend: Collective Types**
   - Service methods for CRUD
   - Routes for collective types API
   - Include roles and rules in responses

4. **Backend: Collectives**
   - Service methods for collective CRUD
   - Routes for collectives API

5. **Backend: Memberships**
   - Service methods for membership management
   - Automatic relationship creation logic
   - Relationship preview endpoint
   - Deactivate/reactivate logic

6. **Frontend: Store & API**
   - API client functions
   - Svelte stores for collectives

7. **Frontend: Collective Management**
   - List, detail, and form components
   - Navigation integration

8. **Frontend: Membership Management**
   - Member list and add member form
   - Relationship preview UI
   - Deactivation flow

9. **Frontend: Collective Type Management** (if custom types enabled)
   - Type editor components
   - Role and rule editors

10. **Testing**
    - Unit tests for relationship rule logic
    - Integration tests for automatic relationship creation
    - E2E tests for common workflows

---

## Edge Cases & Considerations

### What if a relationship already exists?
- Skip creating duplicate relationships
- Show in preview which relationships already exist

### What if the relationship type from a rule doesn't match?
- Example: Two contacts already have a "friend" relationship, but adding them both as children to a family would create a "sibling" relationship
- Decision: Don't overwrite existing relationships; show a note in preview

### Role changes within a collective
- Example: An employee becomes a manager
- Update the role
- Optionally: Update existing colleague relationships to manager/report
- Consider: This could be a user preference

### Multiple memberships in different collectives
- A contact can be in "Smith Family" as a parent AND "Acme Corp" as an employee
- Each membership creates its own set of relationships
- Relationships from different collectives are independent

### Collective deletion
- Soft delete the collective (sets `deleted_at` timestamp)
- Keep all relationships that were created (they're still valid)
- Membership records remain for history
- Deleted collectives are excluded from normal queries but can be viewed in history

### Contact deletion
- If a contact is deleted, their memberships are cascade-deleted (per `ON DELETE CASCADE`)
- Relationships with `source_membership_id` pointing to deleted memberships have that field set to NULL (per `ON DELETE SET NULL`)
- The relationships themselves remain intact, just without provenance tracking

---

## Future Enhancements

- Collective timeline showing all encounters with members
- Collective-wide events (family reunions, company offsites)
- Inherit collective address to member contacts
- Collective-level notes and reminders
- Visual graph of collective members and relationships
- Merge collectives (e.g., when families join through marriage)

---

## Related Epics

- **Epic 1D:** Contact Relationships - prerequisite, provides relationship types
- **Epic 2:** Encounter Management - encounter logging applies to collective members
- **Epic 4:** Categorization - collectives could be used as a form of grouping
- **Epic 10:** Search - search within collectives
