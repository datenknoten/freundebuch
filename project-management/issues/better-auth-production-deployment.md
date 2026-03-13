# Better Auth + Passkey: Production Deployment Checklist

**Status:** Open
**Priority:** Critical (blocks deployment of `feat/epic-18-better-auth-migration`)
**Related:** Epic 18

## Overview

The Better Auth migration and passkey support have been implemented and tested in development. Before deploying to production (`freundebuch.schumacher.im`), several configuration changes are required on the server and in `docker-compose.prod.yml`.

## Pre-Deployment Changes

### 1. Add `BETTER_AUTH_SECRET` to production `.env`

Generate a strong secret (32+ characters) and add it to the production `.env` at `/srv/freundebuch.schumacher.im/.env`:

```bash
# Generate a secret
openssl rand -hex 32
```

```env
BETTER_AUTH_SECRET=<generated-secret>
```

This is **required** — the backend will fail to start without it. The config validator enforces a minimum length of 32 characters and rejects common placeholder strings.

### 2. Add `WEBAUTHN_RP_ID` to production `.env`

```env
WEBAUTHN_RP_ID=freundebuch.schumacher.im
```

This **must match the domain** users access the site from. If it doesn't match, passkey registration and authentication will fail silently. For development it defaults to `localhost`, but production must be set explicitly.

### 3. Update `docker-compose.prod.yml`

The production compose file is missing the Better Auth and WebAuthn environment variables for the backend service:

```yaml
backend:
  environment:
    # ... existing vars ...
    BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
    WEBAUTHN_RP_ID: ${WEBAUTHN_RP_ID:-localhost}
```

The legacy auth vars (`JWT_SECRET`, `JWT_EXPIRY`, `SESSION_SECRET`, `SESSION_EXPIRY_DAYS`, `PASSWORD_RESET_EXPIRY_HOURS`) can be kept for now — the config schema marks them as optional. They should be removed in a follow-up cleanup once the legacy `auth.users` table is dropped.

### 4. Database Migration

The deploy script runs migrations automatically. Two migrations will execute:

1. `1773320702000_better-auth-migration.ts` — Creates Better Auth core tables (`auth.user`, `auth.session`, `auth.account`, `auth.verification`) and migrates existing users
2. `1773400000000_passkey-support.ts` — Creates `auth.passkey` table

**Important:** The Better Auth migration copies users from `auth.users` (legacy) to `auth.user` (new). After this runs:
- New logins go through Better Auth (`auth.user` / `auth.session`)
- Existing bcrypt passwords are preserved and verified transparently (dual bcrypt/scrypt support)
- No forced password resets needed

### 5. Verify `FRONTEND_URL` is correct

The passkey plugin uses `FRONTEND_URL` as the WebAuthn `origin`. In `docker-compose.prod.yml` this is already set to `https://freundebuch.schumacher.im` — verify this matches exactly (protocol + domain, no trailing slash).

## Known Issues After Deployment

### SabreDAV Still Queries Legacy Tables

The SabreDAV service (`AppPasswordBackend.php`) queries `auth.users` (legacy, integer `id`) to resolve users by email, then looks up app passwords via `auth.app_passwords` (FK to `auth.users.id` as integer).

**This will continue to work** because the legacy tables are preserved alongside the new Better Auth tables. However, it means:

- The legacy `auth.users` table **cannot be dropped** until SabreDAV is updated
- App passwords created via the backend API must continue to write to `auth.app_passwords` with the legacy integer `user_id`

A follow-up ticket is needed to:
1. Update SabreDAV to query `auth.user` (Better Auth, text `id`) instead of `auth.users`
2. Migrate `auth.app_passwords.user_id` from integer (FK to `auth.users.id`) to text (FK to `auth.user.id`)
3. Drop legacy tables (`auth.users`, `auth.sessions`, `auth.password_reset_tokens`)

### Session Invalidation

All existing sessions will be invalidated on deployment because the session mechanism changes from custom JWT/session tokens to Better Auth's cookie-based sessions. Users will need to log in again once. This is expected and unavoidable.

## Deployment Steps

1. SSH into production server
2. Edit `/srv/freundebuch.schumacher.im/.env` — add `BETTER_AUTH_SECRET` and `WEBAUTHN_RP_ID`
3. Update `/srv/freundebuch.schumacher.im/docker-compose.yml` with the new backend env vars (or ensure the updated `docker-compose.prod.yml` from this branch is deployed)
4. Deploy as normal — the deploy script handles image pull, migration, and restart
5. Verify:
   - Login with existing email/password works
   - Registration works
   - Navigate to `/profile` — Passkeys section appears
   - Adding a passkey works (browser prompts for authenticator)
   - Logout and login with passkey works
   - CardDAV sync with app passwords still works (SabreDAV unaffected)

## Rollback

If something goes wrong:
- The deploy script's built-in rollback will restore the previous version
- Legacy `auth.users` table is untouched, so the old auth code would still work
- The new Better Auth tables can be dropped manually if needed:
  ```sql
  DROP TABLE IF EXISTS auth.passkey;
  DROP TABLE IF EXISTS auth.verification;
  DROP TABLE IF EXISTS auth.account;
  DROP TABLE IF EXISTS auth.session;
  DROP TABLE IF EXISTS auth."user" CASCADE;
  ```
