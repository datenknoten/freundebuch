# Epic 5: Multi-User Management

**Status:** Planned
**Phase:** MVP (Phase 1) - Single tenant, Full multi-user in Phase 2
**Priority:** Medium (MVP: High for single-user auth)

## Overview

Perfect for families and households who want to work together! This feature lets multiple people collaborate on a shared contact database while still keeping personal contacts private when you want them to be.

## Goals

- Let multiple people use the same instance together
- Make family collaboration on shared contacts easy and intuitive
- Keep personal contacts private when you want them to be
- Give different users appropriate levels of access
- Keep track of who changed what (no mystery edits!)

## Key Features

### User Accounts (MVP - Phase 1)
- User registration and login
- Email/password authentication
- Password reset functionality
- Profile management (name, email, avatar)
- Account settings
- Session management

### Family/Group Spaces (Phase 2)
- Creation of shared workspaces
- Workspace naming and settings
- Member invitation via email
- Invitation acceptance flow
- Leave workspace functionality
- Workspace deletion (admin only)

### Role-Based Permissions (Phase 2)
- **Admin:** Full access, can manage members, delete workspace
- **Member:** Can create, edit, delete contacts and interactions
- **Read-Only:** Can view but not modify contacts

### Contact Ownership (Phase 2)
- **Personal contacts:** Visible only to the creator
- **Shared contacts:** Visible to all workspace members
- Toggle contact visibility (personal ↔ shared)
- Clear ownership indicators
- Permission-based editing (only owner or admins can edit personal contacts)

### Conflict Resolution (Phase 2)
- Optimistic locking for concurrent edits
- Last-write-wins with conflict notification
- Change preview before overwriting
- Conflict history log

### Activity Tracking (Phase 2)
- Track who created each contact
- Track who last modified contact
- Full change history/audit log
- Activity feed per contact
- Activity feed per user
- Filterable activity timeline

## User Stories

### MVP (Phase 1)
1. As a user, I want to create an account so I can access my contacts securely
2. As a user, I want to log in and out so I can protect my data
3. As a user, I want to reset my password if I forget it
4. As a user, I want to update my profile information

### Phase 2
5. As a family member, I want to create a shared workspace so my family can collaborate on our contacts
6. As a workspace admin, I want to invite family members so they can access shared contacts
7. As a user, I want to keep some contacts private so only I can see them
8. As a user, I want to make certain contacts shared so my family can see them too
9. As a workspace member, I want to see who added or modified a contact so I know who to ask questions
10. As a user, I want to see when someone else is editing a contact so I don't create conflicts

## Technical Considerations

### Database Schema
- `users` table with email, password_hash, name, avatar_url
- `workspaces` table with name, settings
- `workspace_members` junction table with user_id, workspace_id, role
- `workspace_invitations` table for pending invites
- Add `user_id` (owner) and `workspace_id` to contacts table
- Add `is_shared` boolean to contacts table
- `contact_changes` audit log table with user_id, contact_id, field, old_value, new_value, timestamp
- `sessions` table for authentication

### Authentication
- JWT tokens for API authentication
- HTTP-only cookies for web app
- Token refresh mechanism
- Session expiration (configurable)
- Password hashing (bcrypt)

### API Endpoints

#### Phase 1 (MVP)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile

#### Phase 2
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `GET /api/workspaces/:id/members` - List members
- `POST /api/workspaces/:id/invitations` - Invite member
- `POST /api/invitations/:token/accept` - Accept invitation
- `DELETE /api/workspaces/:id/members/:userId` - Remove member
- `PUT /api/workspaces/:id/members/:userId/role` - Change member role
- `GET /api/contacts/:id/history` - Get change history
- `POST /api/contacts/:id/share` - Toggle contact sharing

### Frontend Components

#### Phase 1
- Registration form
- Login form
- Password reset flow
- User profile page
- Account settings

#### Phase 2
- Workspace switcher
- Workspace settings page
- Member management interface
- Invitation form
- Contact sharing toggle
- Change history timeline
- User avatar with role badge
- Activity feed widget
- Conflict resolution dialog

### Security Considerations
- Rate limiting on authentication endpoints
- Email verification (optional for MVP)
- Strong password requirements
- Account lockout after failed attempts
- CSRF protection
- XSS prevention
- SQL injection prevention via parameterized queries

## Success Metrics

### Phase 1
- Users can register, login, and manage their accounts
- Authentication is secure and reliable
- Password reset flow works correctly

### Phase 2
- Multiple users can collaborate on shared contacts
- Personal contacts remain private
- Conflict resolution handles concurrent edits gracefully
- Activity tracking shows accurate change history
- Workspace management is intuitive

## Dependencies

- Email service (for invitations and password resets)
- JWT library
- Password hashing library (bcrypt)

## Out of Scope

- Social login (Google, Facebook, etc. - we'll keep it simple for now)
- Two-factor authentication (2FA - future security enhancement)
- Single Sign-On (SSO)
- Advanced permission matrix (we're sticking with the basic roles for now)
- Real-time collaboration indicators (you won't see live cursors or anything fancy)
- Multi-tenancy isolation for SaaS (that's for a future version)

## Related Epics

- Epic 1: Contact Management (contacts to be shared)
- Epic 4: Categorization & Organization (shared groups/tags)
- All other epics (require user context)
