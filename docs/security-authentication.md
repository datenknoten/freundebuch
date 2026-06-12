# Authentication & Credential Security

## Overview

Freundebuch has two independent credential systems:

1. **Web app sessions** — handled by [Better Auth](https://www.better-auth.com/) (email/password and passkeys)
2. **App passwords** — per-device passwords for CalDAV/CardDAV clients, managed by our own code

This document describes how each one stores and verifies credentials.

> **History:** Before the Better Auth migration (Epic 18), Freundebuch had a hand-rolled session system that stored SHA-256 hashes of random tokens in `auth.sessions.token_hash`. That code has been removed. The legacy `users`, `sessions`, and `password_reset_tokens` tables still exist in the `auth` schema for foreign-key compatibility and will be dropped by a follow-up migration (see `project-management/issues/remove-legacy-authentication-tables-and-code.md`).

## Web App Sessions (Better Auth)

Better Auth (with the `@better-auth/passkey` plugin) owns the login flow end to end:

- **Tables:** `auth.user`, `auth.session`, `auth.account`, `auth.verification`, `auth.passkey`. These follow Better Auth's conventions (singular names, `TEXT` primary keys) rather than our usual database conventions — see the exception note in [database-conventions.md](./database-conventions.md).
- **Passwords:** account passwords are hashed by Better Auth before storage.
- **Passkeys:** WebAuthn credentials are public keys — there is no secret to leak server-side.
- **Sessions:** session tokens are issued as HTTP cookies and validated by Better Auth on each request.

The Better Auth instance is configured in `apps/backend/src/lib/auth.ts`.

## App Passwords (CalDAV/CardDAV)

DAV clients can't do cookie-based login, so each device gets its own app-specific password. Implementation lives in `apps/backend/src/services/app-passwords.service.ts`, with storage in `auth.app_passwords`.

### Creation

1. Generate a cryptographically random password: `crypto.randomBytes(24)` encoded as base64url
2. Format it for humans in dash-separated chunks (`xxxx-xxxx-…`) — shown to the user **exactly once**
3. Store:
   - `password_hash` — a **bcrypt** hash of the raw password
   - `password_prefix` — the first 8 characters in plaintext, used as an indexed lookup key and shown in the UI so users can tell their app passwords apart
4. The plaintext password is never stored and cannot be retrieved later

### Verification

1. The DAV client sends the password via HTTP Basic Auth
2. The server strips the display formatting, then looks up candidate rows by `password_prefix`
3. Each candidate is checked with `bcrypt.compare`
4. On success, `last_used_at` is updated

### Why bcrypt here (but not for the old session tokens)?

App passwords are long random values, so SHA-256 would technically suffice — but unlike per-request session validation, DAV authentication is comparatively infrequent, so bcrypt's cost is affordable and buys defense in depth. The prefix index keeps lookups fast: bcrypt only runs against the handful of rows sharing the same 8-character prefix.

### Limits

- Maximum number of app passwords per user is enforced at creation time
- Each app password can be revoked individually without affecting other devices

## Security Properties

1. **Database breach protection** — neither Better Auth password hashes nor bcrypt app-password hashes can be reversed into working credentials
2. **Passkey phishing resistance** — WebAuthn credentials are origin-bound and never leave the authenticator
3. **Per-device revocation** — losing a phone means revoking one app password, not rotating your account password
4. **One-time display** — app passwords are shown once at creation and only identified by name and prefix afterwards

## References

- [Better Auth documentation](https://www.better-auth.com/docs)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [WebAuthn (W3C)](https://www.w3.org/TR/webauthn-2/)
