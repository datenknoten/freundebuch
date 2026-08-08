---
status: accepted
date: 2026-07-30
---

# Use Better Auth as the OAuth 2.1 authorization server for MCP

## Context and Problem Statement

The MCP server (`apps/mcp-server`) authenticated clients with HTTP Basic auth
against app passwords — the same credential DAV clients use. That works for
locally configured clients, but remote MCP connectors such as claude.ai follow
the [MCP Authorization spec](https://modelcontextprotocol.io/specification/basic/authorization),
which requires OAuth 2.1 with PKCE and Dynamic Client Registration: the client
discovers the authorization server, registers itself, and sends a bearer token.
A self-hosted Freundebuch had no way to serve that flow. Where should the
authorization server live?

## Considered Options

* Reuse the backend's existing Better Auth instance as the OAuth provider, via
  Better Auth's `mcp()` plugin
* Keep Basic auth with app passwords only, and accept that remote connectors
  cannot connect
<!-- TODO: confirm with team — a standalone OAuth server (e.g. Hydra/Keycloak)
     or a hand-rolled provider may have been weighed; the git history does not
     record it. -->

## Decision Outcome

Chosen option: "Reuse the backend's existing Better Auth instance", because the
users, sessions, and passkeys OAuth has to authenticate already live there. The
`mcp()` plugin brings DCR, PKCE enforcement, and a consent hand-off for free, so
the whole feature is a plugin registration plus one migration rather than a new
service to deploy, back up, and secure.

Concretely:

- **Backend = authorization server.** `apps/backend/src/lib/auth.ts` registers
  `mcp()` with `allowDynamicClientRegistration`, `requirePKCE`, a login page at
  `/auth/login`, and a consent page at `/oauth/consent`. Endpoints live under
  `/api/auth/oauth2/*`, discovery metadata under `/api/auth/.well-known/*`.
- **New tables in the `auth` schema** (migration `1779667600000_oauth-provider`):
  `oauth_application`, `oauth_access_token`, `oauth_consent`. The plugin's
  camelCase model defaults are mapped onto our snake_case convention via its
  `schema` overrides, mirroring how the account/session models are already
  remapped.
- **MCP server = resource server.** It co-locates the same Better Auth instance
  (imported from `@freundebuch/backend`) and validates bearer tokens with
  `getMcpSession`, adding its own expiry check. Because MCP tools scope queries
  by the legacy `auth.users.external_id`, the token subject is bridged to it by
  email — the same bridge the backend's auth middleware uses.
- **`BETTER_AUTH_URL`** carries the public origin so the OAuth issuer and the
  RFC 9728 `resource` audience are stable and self-host-friendly. Backend and
  mcp-server must agree on it, and the mcp-server needs the same
  `BETTER_AUTH_SECRET` and database.
- **nginx** maps `/.well-known/oauth-authorization-server`,
  `/openid-configuration`, and `/oauth-protected-resource(/mcp)` at the origin
  root onto the backend's `/api/auth/.well-known/*`, because clients probe the
  root. All four config templates carry the block.

_This ADR was backfilled from git history (8b80225e)._

### Consequences

* Good, because remote connectors work against a self-hosted instance with no
  extra service: one plugin, one migration, four nginx locations.
* Good, because OAuth users authenticate through the existing login form,
  passkeys included, and the authorize flow resumes after sign-in.
* Good, because Basic-auth clients are untouched — they send credentials
  proactively and never see the Bearer challenge. The MCP server dispatches on
  the `Authorization` scheme and answers a 401 with a `WWW-Authenticate`
  challenge matching the scheme presented, so a rejected OAuth client can
  restart discovery instead of being pushed into Basic auth.
* Bad, because the MCP server now imports the backend's Better Auth instance and
  needs the same secret and database connection. The two apps are no longer
  independently deployable.
* Bad, because token subjects need the email bridge to the legacy
  `auth.users.external_id`. This disappears with Epic 18 (legacy auth table
  removal) but is a moving part until then.
* Neutral, because the OAuth issuer is now configuration-sensitive: a
  `BETTER_AUTH_URL` that disagrees between backend and mcp-server, or with the
  public origin, breaks discovery rather than degrading quietly.
