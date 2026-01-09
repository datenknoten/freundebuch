# Epic 5: Multi-User Management

**Status:** Done
**Phase:** MVP (Phase 1) - Single user authentication
**Priority:** High

> **Note:** Phase 2 (Multi-user workspaces, sharing, permissions) has been extracted to [Epic 16: Multi-User Workspaces](epic-16-planned-multi-user-workspaces.md).
**GitHub Issue:** [#7](https://github.com/enko/freundebuch2/issues/7)

## Overview

Perfect for families and households who want to work together! This feature lets multiple people collaborate on a shared contact database while still keeping personal contacts private when you want them to be.

## Goals

- Let multiple people use the same instance together
- Make family collaboration on shared contacts easy and intuitive
- Keep personal contacts private when you want them to be
- Give different users appropriate levels of access
- Keep track of who changed what (no mystery edits!)

## Key Features

### User Accounts (MVP - Phase 1) - IMPLEMENTED
- User registration and login
- Email/password authentication
- Password reset functionality
- Profile management (email)
- User preferences (contacts page size)
- Session management with JWT tokens
- Rate limiting on authentication endpoints

> **Note:** Phase 2 features (Family/Group Spaces, Role-Based Permissions, Contact Ownership, Conflict Resolution, Activity Tracking) have been extracted to [Epic 16: Multi-User Workspaces](epic-16-planned-multi-user-workspaces.md).

## User Stories

### MVP (Phase 1) - IMPLEMENTED
1. As a user, I want to create an account so I can access my contacts securely
2. As a user, I want to log in and out so I can protect my data
3. As a user, I want to reset my password if I forget it
4. As a user, I want to update my profile information

> **Note:** Phase 2 user stories have been moved to [Epic 16: Multi-User Workspaces](epic-16-planned-multi-user-workspaces.md).

## Technical Considerations

### Database Schema - IMPLEMENTED
- `auth.users` table with email, password_hash, preferences (JSONB)
- `auth.sessions` table for authentication with token hashing
- `auth.password_reset_tokens` table for password reset flow

### Authentication - IMPLEMENTED
- JWT tokens for API authentication
- HTTP-only cookies for web app
- Token refresh mechanism
- Session expiration (configurable)
- Password hashing (bcrypt)

### API Endpoints - IMPLEMENTED

#### Phase 1 (MVP)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/preferences` - Update user preferences
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile

> **Note:** Phase 2 API endpoints have been moved to [Epic 16: Multi-User Workspaces](epic-16-planned-multi-user-workspaces.md).

### Frontend Components - IMPLEMENTED

#### Phase 1
- Registration form (`RegisterForm.svelte`)
- Login form (`LoginForm.svelte`)
- Password reset flow (`ForgotPasswordForm.svelte`, `ResetPasswordForm.svelte`)
- User profile page (`/profile`)
- Auth store with full state management

> **Note:** Phase 2 components have been moved to [Epic 16: Multi-User Workspaces](epic-16-planned-multi-user-workspaces.md).

### Security Considerations - IMPLEMENTED
- Rate limiting on authentication endpoints (5/min auth, 3/hour password reset)
- Strong password requirements (8+ chars, uppercase, lowercase, digit)
- SQL injection prevention via PgTyped parameterized queries
- Session token hashing (SHA-256)

## Success Metrics

### Phase 1 - ACHIEVED
- Users can register, login, and manage their accounts
- Authentication is secure and reliable
- Password reset flow works correctly

> **Note:** Phase 2 success metrics have been moved to [Epic 16: Multi-User Workspaces](epic-16-planned-multi-user-workspaces.md).

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
