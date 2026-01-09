# Epic 16: Multi-User Workspaces

**Status:** Planned
**Phase:** Phase 2
**Priority:** Medium
**Depends On:** Epic 5 (Multi-User Management - Phase 1)
**Extracted From:** Epic 5 Phase 2

## Overview

Perfect for families and households who want to work together! This feature lets multiple people collaborate on a shared contact database while still keeping personal contacts private when you want them to be.

## Goals

- Let multiple people use the same instance together
- Make family collaboration on shared contacts easy and intuitive
- Keep personal contacts private when you want them to be
- Give different users appropriate levels of access
- Keep track of who changed what (no mystery edits!)

## Key Features

### Family/Group Spaces
- Creation of shared workspaces
- Workspace naming and settings
- Member invitation via email
- Invitation acceptance flow
- Leave workspace functionality
- Workspace deletion (admin only)

### Role-Based Permissions
- **Admin:** Full access, can manage members, delete workspace
- **Member:** Can create, edit, delete contacts and interactions
- **Read-Only:** Can view but not modify contacts

### Contact Ownership
- **Personal contacts:** Visible only to the creator
- **Shared contacts:** Visible to all workspace members
- Toggle contact visibility (personal <-> shared)
- Clear ownership indicators
- Permission-based editing (only owner or admins can edit personal contacts)

### Conflict Resolution
- Optimistic locking for concurrent edits
- Last-write-wins with conflict notification
- Change preview before overwriting
- Conflict history log

### Activity Tracking
- Track who created each contact
- Track who last modified contact
- Full change history/audit log
- Activity feed per contact
- Activity feed per user
- Filterable activity timeline

## User Stories

1. As a family member, I want to create a shared workspace so my family can collaborate on our contacts
2. As a workspace admin, I want to invite family members so they can access shared contacts
3. As a user, I want to keep some contacts private so only I can see them
4. As a user, I want to make certain contacts shared so my family can see them too
5. As a workspace member, I want to see who added or modified a contact so I know who to ask questions
6. As a user, I want to see when someone else is editing a contact so I don't create conflicts

## Technical Considerations

### Database Schema

```sql
-- Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace members
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('admin', 'member', 'read_only')),
    CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
);

-- Workspace invitations
CREATE TABLE workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('admin', 'member', 'read_only'))
);

-- Add to contacts table
ALTER TABLE contacts.contacts 
    ADD COLUMN workspace_id UUID REFERENCES workspaces(id),
    ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;

-- Contact change history
CREATE TABLE contact_changes (
    id BIGSERIAL PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_changes_contact_id ON contact_changes(contact_id);
CREATE INDEX idx_contact_changes_user_id ON contact_changes(user_id);
CREATE INDEX idx_contact_changes_changed_at ON contact_changes(changed_at DESC);
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces` | List user's workspaces |
| POST | `/api/workspaces` | Create workspace |
| PUT | `/api/workspaces/:id` | Update workspace |
| DELETE | `/api/workspaces/:id` | Delete workspace |
| GET | `/api/workspaces/:id/members` | List members |
| POST | `/api/workspaces/:id/invitations` | Invite member |
| POST | `/api/invitations/:token/accept` | Accept invitation |
| DELETE | `/api/workspaces/:id/members/:userId` | Remove member |
| PUT | `/api/workspaces/:id/members/:userId/role` | Change member role |
| GET | `/api/contacts/:id/history` | Get change history |
| POST | `/api/contacts/:id/share` | Toggle contact sharing |

### Frontend Components

| Component | Description |
|-----------|-------------|
| `WorkspaceSwitcher` | Dropdown to switch between workspaces |
| `WorkspaceSettings` | Settings page for workspace |
| `MemberManagement` | Manage workspace members |
| `InvitationForm` | Invite new members |
| `ContactSharingToggle` | Toggle contact visibility |
| `ChangeHistoryTimeline` | Show contact change history |
| `ActivityFeed` | Recent activity widget |
| `ConflictResolutionDialog` | Handle concurrent edit conflicts |

## Success Metrics

- Multiple users can collaborate on shared contacts
- Personal contacts remain private
- Conflict resolution handles concurrent edits gracefully
- Activity tracking shows accurate change history
- Workspace management is intuitive

## Dependencies

- Epic 5: Multi-User Management Phase 1 (authentication) - **Done**
- Email service for invitations

## Out of Scope

- Social login (Google, Facebook, etc.)
- Two-factor authentication (2FA)
- Single Sign-On (SSO)
- Advanced permission matrix
- Real-time collaboration indicators
- Multi-tenancy isolation for SaaS

## Related Epics

- **Epic 5:** Multi-User Management - provides authentication foundation
- **Epic 1:** Contact Management - contacts to be shared
- **Epic 4:** Categorization & Organization - shared groups/tags
