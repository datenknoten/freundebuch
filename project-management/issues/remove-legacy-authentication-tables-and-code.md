# Chore: Remove Legacy Authentication Tables and Code

**Project:** freundebuch2
**Type:** Chore
**Related Epic:** [Epic 18: Better Auth Migration](../epics/epic-18-planned-better-auth-migration.md)
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** Medium

---

## Summary

The authentication system was migrated from a custom JWT/session-based implementation to Better Auth in commit `3681be2`. The legacy database tables (`auth.users`, `auth.sessions`, `auth.password_reset_tokens`), the old service layer, utility functions, SQL queries, and configuration variables are still present in the codebase. Now that Better Auth is the sole authentication provider, this dead code and the legacy tables should be removed to reduce confusion, maintenance burden, and attack surface.

---

## Background

The original auth system used three tables in the `auth` schema:

- **`auth.users`** — email/password credentials with bcrypt hashes
- **`auth.sessions`** — SHA-256 hashed session tokens with expiry
- **`auth.password_reset_tokens`** — time-limited password reset tokens

Better Auth replaced these with its own tables (`auth.user`, `auth.session`, `auth.account`, `auth.verification`, `auth.passkey`). The migration (`1773320702000_better-auth-migration.ts`) copied all users from `auth.users` to `auth.user`, preserving bcrypt password hashes with transparent dual verification.

The legacy code is fully dead — no production code path imports or calls it. However, two systems still reference `auth.users`:

1. **SabreDAV** (`apps/sabredav/src/Auth/AppPasswordBackend.php`, `FreundebuchCardDAVBackend.php`, `FreundebuchPrincipalBackend.php`) queries `auth.users` to resolve users by email and joins against `auth.app_passwords.user_id` (integer FK to `auth.users.id`).
2. **Backend app-passwords queries** (`apps/backend/src/models/queries/app-passwords.sql`) join against `auth.users` for app password management.

These dependencies must be migrated to query `auth.user` (Better Auth) before the legacy `auth.users` table can be dropped.

---

## Phase 1: Remove Dead Code (No Blockers)

The following artifacts are completely unused and can be removed immediately.

### Files to Delete

| File | Reason |
|------|--------|
| `apps/backend/src/services/auth.service.ts` | Entire legacy auth service (~490 lines). Not imported anywhere. |
| `apps/backend/src/models/queries/sessions.sql` | Legacy session queries. Not used by any production code. |
| `apps/backend/src/models/queries/sessions.queries.ts` | PgTyped-generated file from `sessions.sql`. Not imported anywhere. |
| `apps/backend/src/models/queries/password-reset-tokens.sql` | Legacy password reset queries. Not used by any production code. |
| `apps/backend/src/models/queries/password-reset-tokens.queries.ts` | PgTyped-generated file from `password-reset-tokens.sql`. Not imported anywhere. |

### Functions to Remove from `apps/backend/src/utils/auth.ts`

The following exported functions are only imported by `auth.service.ts` (which is itself dead code):

- `generateToken()` — JWT generation
- `verifyToken()` — JWT verification
- `generateSessionToken()` — random session token generation
- `hashSessionToken()` — SHA-256 hashing
- `getSessionExpiry()` — session expiry calculation
- `generatePasswordResetToken()` — random reset token generation
- `getPasswordResetExpiry()` — reset token expiry calculation
- `getAuthTokenCookieOptions()` — legacy JWT cookie options

**Keep** `hashPassword()`, `verifyPassword()`, `getSessionCookieOptions()`, and `getClearCookieOptions()` if still referenced by Better Auth or other production code. If not, remove the entire file.

### Legacy Queries to Remove from `apps/backend/src/models/queries/users.sql`

Remove the following queries that target the legacy `auth.users` table:

- `GetUserByExternalId`
- `GetUserByEmail`
- `GetUserByEmailWithSelfProfile`
- `CreateUser`
- `UpdateUser`
- `UpdateUserPassword`
- `DeleteUser`

**Keep** queries that target `auth."user"` (Better Auth): `GetUserWithPreferences`, `GetUserSelfProfile`, `SetUserSelfProfile`, `HasSelfProfile`.

### Configuration Cleanup

**`apps/backend/src/utils/config.ts`** — Remove legacy optional env vars:
- `JWT_SECRET?`
- `JWT_EXPIRY?`
- `SESSION_SECRET?`
- `SESSION_EXPIRY_DAYS?`
- `PASSWORD_RESET_EXPIRY_HOURS?`

**`.env.example`** — Remove the commented-out legacy auth section.

### Dependencies to Audit

Check whether `jsonwebtoken` and `bcrypt` in `apps/backend/package.json` are still needed after removing the legacy code. Better Auth uses its own password hashing (scrypt) but the dual-verification path may still use bcrypt via the custom `verifyPassword` callback in `apps/backend/src/lib/auth.ts`. If bcrypt is still needed for legacy password verification, keep it; otherwise remove it. `jsonwebtoken` should be safe to remove entirely.

### Documentation

- Update or archive `docs/security-session-tokens.md` (describes the legacy session approach)
- Update Epic 18 status to reflect cleanup completion

---

## Phase 2: Migrate SabreDAV and App Passwords off Legacy Tables

Before the legacy `auth.users` table can be dropped, the following must be updated:

### SabreDAV PHP Files

| File | Change |
|------|--------|
| `apps/sabredav/src/Auth/AppPasswordBackend.php` | Query `auth.user` (text `id`) instead of `auth.users` (integer `id`) |
| `apps/sabredav/src/CardDAV/FreundebuchCardDAVBackend.php` | Query `auth.user` instead of `auth.users` |
| `apps/sabredav/src/Principal/FreundebuchPrincipalBackend.php` | Query `auth.user` instead of `auth.users` |
| Integration tests referencing `auth.users` | Update to use `auth.user` |

### Backend App Passwords

| File | Change |
|------|--------|
| `apps/backend/src/models/queries/app-passwords.sql` | Change JOINs from `auth.users` to `auth.user`; update `user_id` references from integer to text |

### Database Migration

Create a migration to:

1. Alter `auth.app_passwords.user_id` from `INTEGER` (FK to `auth.users.id`) to `TEXT` (FK to `auth.user.id`), mapping existing values via the `auth.users.external_id` <-> `auth.user.id` relationship
2. Drop `auth.password_reset_tokens`
3. Drop `auth.sessions`
4. Drop `auth.users`

---

## Acceptance Criteria

### Phase 1

- [ ] `apps/backend/src/services/auth.service.ts` is deleted
- [ ] `apps/backend/src/models/queries/sessions.sql` and its `.queries.ts` are deleted
- [ ] `apps/backend/src/models/queries/password-reset-tokens.sql` and its `.queries.ts` are deleted
- [ ] Legacy JWT/session utility functions are removed from `apps/backend/src/utils/auth.ts`
- [ ] Legacy queries are removed from `apps/backend/src/models/queries/users.sql` (and `.queries.ts` regenerated)
- [ ] Legacy env vars are removed from `config.ts` and `.env.example`
- [ ] `jsonwebtoken` dependency is removed from `apps/backend/package.json`
- [ ] `docs/security-session-tokens.md` is updated or archived
- [ ] All existing tests pass
- [ ] No production code imports any deleted file (verify with `grep -r` across `apps/backend/src/`)

### Phase 2

- [ ] SabreDAV PHP files query `auth.user` instead of `auth.users`
- [ ] `app-passwords.sql` queries join against `auth.user` instead of `auth.users`
- [ ] `auth.app_passwords.user_id` is migrated from integer to text with correct FK
- [ ] `auth.password_reset_tokens`, `auth.sessions`, and `auth.users` tables are dropped via migration
- [ ] SabreDAV integration tests pass
- [ ] App password integration tests pass
- [ ] CardDAV sync continues to work end-to-end

---

## Out of Scope

- Changes to Better Auth configuration or its tables
- Frontend authentication changes (already fully migrated)
- Password rehashing strategy (dual bcrypt/scrypt verification remains as-is)
- Any new auth features (e.g., OAuth providers, MFA beyond passkeys)

---

## Dependencies

- **Phase 1** has no blockers and can proceed immediately
- **Phase 2** blocks on Phase 1 being complete (to avoid partial states)
- **Dropping `auth.users`** blocks on SabreDAV and app-passwords being migrated (Phase 2)
- Related: [Better Auth Production Deployment](./better-auth-production-deployment.md) should be completed before or alongside this work

---

## Related Issues

- [Better Auth Production Deployment Checklist](./better-auth-production-deployment.md) — documents the SabreDAV legacy dependency
- [Epic 18: Better Auth Migration](../epics/epic-18-planned-better-auth-migration.md) — parent epic, cleanup steps outlined in lines 305–309
