# Authentication & Credential Security

## Overview

Freundebuch has three independent credential systems:

1. **Web app sessions** — handled by [Better Auth](https://www.better-auth.com/) (email/password and passkeys)
2. **App passwords** — per-device passwords for CalDAV/CardDAV clients, managed by our own code
3. **OAuth 2.1 access tokens** — for remote MCP clients, issued by Better Auth's `mcp()` provider

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

## OAuth 2.1 Access Tokens (MCP)

Remote MCP clients such as claude.ai cannot be handed an app password — the [MCP Authorization spec](https://modelcontextprotocol.io/specification/basic/authorization) has them discover an authorization server and obtain a token instead. The backend's Better Auth instance plays that role via the `mcp()` plugin; see [ADR 0001](./decisions/0001-better-auth-as-oauth-server-for-mcp.md) for why.

- **Tables:** `auth.oauth_application` (registered clients), `auth.oauth_access_token`, `auth.oauth_consent`. Like the other Better Auth tables these use the plugin's model names, remapped to snake_case columns.
- **Registration:** clients register themselves (RFC 7591 Dynamic Client Registration) — claude.ai's client ID field is optional, so this is the primary path.
- **Authorization:** OAuth 2.1 with PKCE required. An unauthenticated authorize request lands on the normal login page (passkeys included) and resumes the flow afterwards, same-origin only. The user then approves the client on `/oauth/consent`, and the grant is recorded in `auth.oauth_consent`.
- **Endpoints:** `/api/auth/oauth2/*`, with discovery metadata at `/api/auth/.well-known/*`. Nginx mirrors the metadata at the origin root, where clients look for it.
- **Verification:** the MCP server is the resource server. It validates the bearer token against the shared `auth` schema with `getMcpSession`, plus its own expiry check, then bridges the token subject to the legacy `auth.users.external_id` by email — the same bridge the backend's auth middleware uses.

### Scheme dispatch

The MCP server decides on the `Authorization` header's scheme: `Bearer` goes through OAuth validation, `Basic` through app-password verification. A rejected request gets a `WWW-Authenticate` challenge matching the scheme it presented, so an OAuth client restarts discovery rather than being pushed into Basic auth. Basic-auth clients send credentials proactively and never see the Bearer challenge.

### Issuer configuration

`BETTER_AUTH_URL` is the deployment's public origin and becomes the OAuth issuer and the RFC 9728 `resource` audience. Backend and MCP server must be given the same value (and the same `BETTER_AUTH_SECRET` and database), or token lookups and discovery fail. When unset it falls back to `FRONTEND_URL`, which is correct for local development.

## Security Properties

1. **Database breach protection** — neither Better Auth password hashes nor bcrypt app-password hashes can be reversed into working credentials
2. **Passkey phishing resistance** — WebAuthn credentials are origin-bound and never leave the authenticator
3. **Per-device revocation** — losing a phone means revoking one app password, not rotating your account password
4. **One-time display** — app passwords are shown once at creation and only identified by name and prefix afterwards
5. **No credential sharing with AI clients** — an MCP connector holds a scoped, expiring OAuth token, never your password

## References

- [Better Auth documentation](https://www.better-auth.com/docs)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [WebAuthn (W3C)](https://www.w3.org/TR/webauthn-2/)
- [MCP Authorization specification](https://modelcontextprotocol.io/specification/basic/authorization)
- [ADR 0001 — Better Auth as the OAuth 2.1 authorization server for MCP](./decisions/0001-better-auth-as-oauth-server-for-mcp.md)
