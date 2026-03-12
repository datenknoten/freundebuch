# Epic 18: Better Auth Migration

**Status:** Planned
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** High
**Depends On:** Epic 5 (Multi-User Management)

## Overview

Replace our custom authentication implementation with [Better Auth](https://www.better-auth.com/), a comprehensive, framework-agnostic authentication library for TypeScript. This migration will reduce maintenance burden, improve security, and unlock advanced authentication features with minimal custom code.

## Goals

- Eliminate maintenance overhead of custom auth code
- Gain access to battle-tested, actively maintained authentication
- Enable future authentication enhancements (social login, passkeys, 2FA) with simple configuration
- Improve type safety across auth flows
- Maintain all existing functionality during migration
- Prepare for multi-tenant features in Phase 2 (Epic 16)

## Why Better Auth?

### Current State (Custom Implementation)
- ~1,000 lines of custom auth code across service (488), routes (333), utilities (170), and middleware (57)
- Manual JWT + session token dual-token handling with `jsonwebtoken`
- Custom session management with database queries
- Hand-rolled password reset token flow
- Custom rate limiting middleware for auth endpoints
- Requires ongoing security maintenance

### Benefits of Better Auth
- **Framework agnostic:** Works seamlessly with Hono (our backend framework)
- **Database adapters:** Native PostgreSQL support with automatic schema generation
- **Type-safe:** Full TypeScript support throughout
- **Plugin ecosystem:** Add features like 2FA, passkeys, magic links by installing plugins
- **Active maintenance:** Backed by Y Combinator, active community (5K+ Discord members)
- **Security built-in:** Password policies, rate limiting, and MFA out of the box
- **Multi-tenant ready:** Organization and team support for Epic 16 features

## Key Features

### Phase 1: Core Migration
- Email/password authentication (replace existing)
- Session management (database-backed, cookie-based)
- Password reset flow
- Profile management
- Cookie-based sessions with HTTP-only security (replaces current dual JWT + session token approach)

### Phase 2 Enablers (Configuration Only)
- Social OAuth providers (Google, GitHub, etc.)
- Two-factor authentication (TOTP, SMS)
- Passkey/WebAuthn support
- Magic link authentication
- Organization/workspace management
- Role-based access control

## User Stories

1. As a user, I want to continue logging in with email/password without any disruption
2. As a user, I want my existing session to remain valid during the migration
3. As an admin, I want reduced auth-related maintenance work
4. As a developer, I want to add new auth methods (2FA, social login) with minimal code

## Technical Considerations

### Architecture Change: Unified Session Model

The current implementation uses a **dual-token architecture**:
- A session token (opaque, SHA-256 hashed in DB, `session_token` cookie) for refresh
- A JWT access token (`Authorization: Bearer` header + `auth_token` cookie) for API auth

Better Auth uses a **unified cookie-based session model**. We will migrate fully to Better Auth sessions:
- Remove JWT access token generation and verification
- Remove `auth_token` cookie — all auth goes through Better Auth's session cookie
- Update the frontend API client (`apps/frontend/src/lib/api/client.ts`) to stop reading access tokens from the Svelte store and sending `Authorization: Bearer` headers
- Rely on `credentials: 'include'` (already in place) for cookie-based session auth
- Update `apps/backend/src/middleware/auth.ts` to validate sessions via Better Auth's `auth.api.getSession()` instead of JWT verification

### Database Schema Changes

Better Auth manages its own schema with four core tables: `user`, `session`, `account`, and `verification`.

**Better Auth core schema:**
- `user`: `id` (text PK), `name`, `email` (unique), `emailVerified` (boolean), `image`, `createdAt`, `updatedAt`
- `session`: `id` (text PK), `expiresAt`, `token` (unique), `createdAt`, `updatedAt`, `ipAddress`, `userAgent`, `userId` (FK → user)
- `account`: `id` (text PK), `accountId`, `providerId`, `userId` (FK → user), `password`, `accessToken`, `refreshToken`, `idToken`, various expiry fields, `scope`, `createdAt`, `updatedAt`
- `verification`: `id` (text PK), `identifier`, `value`, `expiresAt`

**Migration strategy:**

1. **Rename the current `auth` schema** to `auth_legacy` to preserve existing data and make room for Better Auth
2. **Create a new `auth` schema** for Better Auth using its CLI migration tool with custom `search_path`:
   ```
   DATABASE_URL=postgres://...?options=-c%20search_path%3Dauth
   ```
3. **Run both systems in parallel** during a transition period:
   - Better Auth handles all new logins and registrations
   - Legacy system remains available as fallback
   - Gradual user migration via dual-algorithm password verification (see below)
4. **Migrate existing users** to Better Auth tables via a data migration script:
   - Map `auth_legacy.users.external_id` → Better Auth `user.id` (configure Better Auth to use our existing UUIDs as primary keys)
   - Copy email, timestamps
   - Create `account` entries with `providerId: 'credential'` and migrated password hashes
5. **Drop `auth_legacy` schema** after verification period (2 weeks)

**External ID mapping (critical):**
Our app uses a dual-ID pattern (`id` SERIAL internal + `external_id` UUID exposed). The `external_id` is referenced as a foreign key throughout the app (friends, encounters, collectives, etc.). Better Auth's `user.id` field must be set to our existing `external_id` UUIDs to avoid breaking all foreign key relationships.

### Password Hashing: bcrypt → scrypt Transition

Better Auth uses **scrypt** by default, not bcrypt. Our existing passwords are hashed with **bcrypt** (10 salt rounds). Direct migration is not possible without custom handling.

**Dual-algorithm strategy during parallel operation:**
```typescript
import bcrypt from "bcrypt";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      // New passwords use Better Auth's default scrypt
      // (omit hash to use default)
      verify: async ({ hash, password }) => {
        // Try scrypt first (new passwords)
        const scryptResult = await defaultVerify({ hash, password });
        if (scryptResult) return true;
        // Fall back to bcrypt (migrated passwords)
        try {
          return await bcrypt.compare(password, hash);
        } catch {
          return false;
        }
      },
    },
  },
});
```

This approach:
- Verifies new passwords (scrypt) and legacy passwords (bcrypt) transparently
- New registrations and password resets automatically use scrypt
- Over time, all passwords naturally migrate to scrypt as users change passwords
- No forced password resets required

### Custom User Fields

The current auth system includes custom fields not part of Better Auth's core schema:
- `selfProfileId` — links to the user's own friend entry (onboarding flow)
- `hasCompletedOnboarding` — derived from whether `selfProfileId` is set
- `preferences` — JSONB field for user preferences (page size, birthday format, table columns, language)

**Strategy:**
- Use Better Auth's `additionalFields` on the `user` model to add `selfProfileId` and `preferences`
- `hasCompletedOnboarding` remains a derived field (computed from `selfProfileId !== null`)
- The `PATCH /api/auth/preferences` endpoint remains as a custom route outside Better Auth's handler

### Backend Changes (Hono)

```typescript
// apps/backend/src/lib/auth.ts - Better Auth configuration
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL + "?options=-c%20search_path%3Dauth",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Match current behavior
    password: {
      // Custom verify for bcrypt/scrypt dual support (see above)
    },
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days (matches current SESSION_EXPIRY_DAYS)
    updateAge: 24 * 60 * 60, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      selfProfileId: { type: "string", required: false },
      preferences: { type: "string", required: false }, // JSON string
    },
  },
});
```

**Files to modify/remove (backend — `apps/backend/src/`):**
- `services/auth.service.ts` — Replace with Better Auth calls (keep preferences and onboarding logic)
- `routes/auth.ts` — Replace with Better Auth handler mount, keep `PATCH /preferences` as custom route
- `middleware/auth.ts` — Replace JWT verification with `auth.api.getSession()` call
- `middleware/onboarding.ts` — Update to read user from Better Auth session
- `middleware/rate-limit.ts` — Remove auth rate limiting (Better Auth handles it), keep other rate limits
- `utils/auth.ts` — Remove entirely (Better Auth handles password hashing, sessions, cookies)
- `utils/config.ts` — Remove `JWT_SECRET`, `JWT_EXPIRY`, `SESSION_SECRET` (replaced by `BETTER_AUTH_SECRET`), keep `SESSION_EXPIRY_DAYS` and `PASSWORD_RESET_EXPIRY_HOURS` if needed for Better Auth config
- `models/queries/sessions.sql` — Remove after migration
- `models/queries/users.sql` — Simplify (remove auth-specific queries, keep preference and self-profile queries)
- `models/queries/password-reset-tokens.sql` — Remove (Better Auth `verification` table handles this)

**Files to modify/remove (shared — `packages/shared/src/`):**
- `auth.ts` — Update `AuthResponse`, `User` type, and request schemas to match Better Auth's response shapes. Remove `RefreshRequestSchema` (no more manual refresh). Keep `PasswordSchema`, `UpdatePreferencesRequestSchema`.

**Files to modify (frontend — `apps/frontend/src/`):**
- `lib/stores/auth.ts` — Replace with Better Auth Svelte client; remove manual token management
- `lib/api/auth.ts` — Replace API calls with Better Auth client methods
- `lib/api/client.ts` — Remove `Authorization: Bearer` header injection; rely on cookies only
- `hooks.server.ts` — Mount Better Auth handler via `svelteKitHandler`; update session/onboarding checks to use `auth.api.getSession()`
- `routes/auth/login/+page.svelte` — Update to use Better Auth `authClient.signIn.email()`
- `routes/auth/register/+page.svelte` — Update to use Better Auth `authClient.signUp.email()`
- `routes/auth/forgot-password/+page.svelte` — Update to use Better Auth `authClient.forgetPassword()`
- `routes/auth/reset-password/+page.svelte` — Update to use Better Auth `authClient.resetPassword()`
- `routes/+layout.svelte` — Update `auth.initialize()` to use Better Auth session; keep onboarding redirect logic
- `routes/+page.svelte` — Update `selfProfileId` access from Better Auth session
- `routes/onboarding/+page.svelte` — Keep self-profile creation logic; update session refresh

### API Endpoint Changes

**Current endpoints → Better Auth equivalents:**
| Current | Better Auth | Notes |
|---------|-------------|-------|
| `POST /api/auth/register` | `POST /api/auth/sign-up/email` | |
| `POST /api/auth/login` | `POST /api/auth/sign-in/email` | |
| `POST /api/auth/logout` | `POST /api/auth/sign-out` | |
| `POST /api/auth/refresh` | Handled automatically by session cookies | Endpoint removed |
| `POST /api/auth/forgot-password` | `POST /api/auth/forget-password` | |
| `POST /api/auth/reset-password` | `POST /api/auth/reset-password` | |
| `GET /api/auth/me` | `GET /api/auth/session` | Response shape changes |
| `PATCH /api/auth/preferences` | Custom route (kept) | Not part of Better Auth |
| `DELETE /api/auth/sessions` (logoutAll) | `POST /api/auth/revoke-sessions` | Currently internal only |

### Migration Steps

1. **Spike / Proof of Concept:**
   - Install Better Auth in a branch
   - Verify bcrypt dual-algorithm verification works
   - Verify `user.id` can be set to existing UUIDs during data migration
   - Verify `additionalFields` works for `selfProfileId` and `preferences`
   - Test Hono integration with session middleware

2. **Prepare database:**
   - Rename `auth` schema to `auth_legacy`
   - Create new `auth` schema
   - Run Better Auth CLI migration: `npx auth@latest migrate`
   - Write and test data migration script (users → Better Auth tables)

3. **Install and configure:**
   ```bash
   pnpm add better-auth
   ```
   - Create Better Auth server config (`apps/backend/src/lib/auth.ts`)
   - Create Better Auth client config (`apps/frontend/src/lib/auth-client.ts`)
   - Add `BETTER_AUTH_SECRET` to environment config

4. **Run data migration:**
   - Copy users from `auth_legacy.users` to Better Auth `user` table (preserving `external_id` as `id`)
   - Create `account` entries with `providerId: 'credential'` and bcrypt password hashes
   - Verify migrated user count matches

5. **Update backend (parallel operation):**
   - Mount Better Auth handler on `/api/auth/*`
   - Update auth middleware to use Better Auth session validation
   - Keep `PATCH /api/auth/preferences` as custom route
   - Update onboarding middleware

6. **Update shared types:**
   - Update `packages/shared/src/auth.ts` response types

7. **Update frontend:**
   - Replace auth store with Better Auth Svelte client
   - Remove Bearer token logic from API client
   - Update all auth pages to use Better Auth client methods
   - Update `hooks.server.ts` with Better Auth handler
   - Update onboarding flow

8. **Test thoroughly:**
   - Registration flow (new user, scrypt password)
   - Login with migrated user (bcrypt password)
   - Login with new user (scrypt password)
   - Logout / logout all devices
   - Password reset flow (bcrypt → scrypt upgrade)
   - Session persistence across page reloads
   - Onboarding flow (selfProfileId, hasCompletedOnboarding)
   - Preferences update
   - Protected route access
   - Image loading (previously relied on `auth_token` cookie)

9. **Clean up (after 2-week verification):**
   - Remove old auth code (service, utils, SQL queries)
   - Drop `auth_legacy` schema
   - Remove `JWT_SECRET`, `SESSION_SECRET` from environment
   - Remove `bcrypt` and `jsonwebtoken` dependencies
   - Update documentation

### Rollback Strategy

- Keep `auth_legacy` schema intact for 2 weeks post-migration
- Database backup before data migration
- If critical issues arise, revert code to pre-migration commit and rename `auth_legacy` back to `auth`
- No feature flag system needed — rollback is a code + schema revert

## Success Metrics

- All existing auth functionality works identically
- Zero user-facing disruption during migration
- Reduction in auth-related code by ~70%
- All existing tests pass (with updates)
- No increase in login/registration latency
- Migrated users can log in without password reset

## Dependencies

- Better Auth library (pin to specific version, e.g., v1.6.x)
- PostgreSQL custom schema support (`search_path`)
- SvelteKit client integration (`better-auth/svelte`)
- `sveltekitCookies` plugin (requires SvelteKit 2.20.0+)

## Out of Scope (This Epic)

- Social login implementation (future epic)
- Two-factor authentication (future epic)
- Passkey support (future epic)
- Email verification (future epic)
- Organization/workspace features (Epic 16)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Session invalidation during migration | Users logged out once | Accept one-time logout; communicate in advance |
| Password hash incompatibility (bcrypt vs scrypt) | Users can't login | Dual-algorithm verify function; spike validates this first |
| API contract changes break frontend | Frontend errors | Update frontend and shared types in same deployment |
| Better Auth bugs | Auth failures | Pin version; thorough testing; staged rollout |
| External ID mapping breaks foreign keys | Data integrity loss | Spike validates UUID-as-primary-key approach first |
| Custom fields (selfProfileId, preferences) don't fit Better Auth model | Feature regression | Validate `additionalFields` in spike; fall back to separate table if needed |
| Image loading breaks without `auth_token` cookie | Broken images | Better Auth's session cookie with `credentials: 'include'` should cover this; test explicitly |
| Better Auth rate limiting conflicts with existing limits | Double rate limiting or no limiting | Remove custom auth rate limiting; configure Better Auth's built-in limits to match (5/min login, 3/hr password reset) |

## Related Epics

- **Epic 5: Multi-User Management** - Existing auth implementation to replace
- **Epic 16: Multi-User Workspaces** - Better Auth's organization features align with this
- **Epic 13: Self-Service Pages** - May use Better Auth's invite/magic link features

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)
- [Hono Integration Guide](https://www.better-auth.com/docs/integrations/hono)
- [SvelteKit Integration Guide](https://www.better-auth.com/docs/integrations/svelte-kit)
- [PostgreSQL Adapter](https://www.better-auth.com/docs/adapters/postgresql)
- [PostgreSQL Custom Schema (Issue #4452)](https://github.com/better-auth/better-auth/issues/4452)
- [Auth0 Migration Guide (bcrypt reference)](https://better-auth.com/docs/guides/auth0-migration-guide)
- [Better Auth Database Concepts](https://better-auth.com/docs/concepts/database)
