# Self-Hosting Freundebuch

Everything you need to run Freundebuch on your own server. This is the operations
counterpart to [architecture.md](./architecture.md) — that one explains how the
pieces fit together, this one explains how to run them.

## What you're deploying

Five containers, all published to `ghcr.io` as multi-arch images (amd64 + arm64)
on every release:

| Image | Role |
|-------|------|
| `ghcr.io/datenknoten/freundebuch-nginx` | Reverse proxy **and** the built frontend — the static SPA is baked into this image, there is no separate frontend service |
| `ghcr.io/datenknoten/freundebuch-backend` | Hono API, Better Auth, and the compiled database migrations |
| `ghcr.io/datenknoten/freundebuch-mcp-server` | MCP endpoint for AI assistants (`/mcp`) |
| `ghcr.io/datenknoten/freundebuch-sabredav` | CalDAV/CardDAV (PHP-FPM) |
| `ghcr.io/datenknoten/freundebuch-osm-import` | One-shot OSM address import, only under the `import` profile |

Plus PostgreSQL 18 with PostGIS 3.6. The compose file uses
`imresamu/postgis:18-3.6.1-trixie`, picked for its arm64 builds.

Every release pushes four tags per image: the full version (`2.92.0`), the minor
series (`2.92`), the major series (`2`), and `latest`. Pin `VERSION` to a full
version or a series rather than tracking `latest`, so upgrades are something you
choose. Manifests carry build-provenance attestations, verifiable with
`gh attestation verify oci://ghcr.io/datenknoten/freundebuch-backend:<tag> --owner datenknoten`.

## Before you start

- A domain with TLS. Passkeys and the MCP OAuth flow both require HTTPS on a
  stable origin — neither works over plain HTTP or a bare IP.
- Docker with Compose v2.
- Something terminating TLS. The bundled `docker-compose.prod.yml` expects
  [Traefik](https://traefik.io) on an external network; any reverse proxy works
  as long as it forwards to the nginx container's port 80 and sets
  `X-Forwarded-Proto` and `X-Forwarded-For`.

## `docker-compose.prod.yml` is our deployment, not a turnkey one

The file in this repo runs the maintainer's instance. Copy it and adjust — it
will not work unmodified on your infrastructure:

| What | Why |
|------|-----|
| `freundebuch.schumacher.im` | Hardcoded in the Traefik router labels and in `FRONTEND_URL` / `BACKEND_URL`. Replace every occurrence with your domain. |
| The external `traefik` network | Remove it (and the `traefik.*` labels) if you terminate TLS differently, then publish the nginx port yourself. |
| `ENV: production` on the backend | **Not set upstream.** Add it — see below. |
| `TRUST_PROXY: "true"` on the backend | Not set upstream. Add it if a proxy sits in front, or rate limiting keys off the proxy's IP instead of the client's. |
| `WEBAUTHN_RP_ID` on the backend | Not set upstream. Set it to your bare domain (no scheme, no port) or passkey registration fails. |
| `JWT_SECRET`, `SESSION_SECRET`, `JWT_EXPIRY`, `SESSION_EXPIRY_DAYS`, `PASSWORD_RESET_EXPIRY_HOURS` | Leftovers from the pre-Better-Auth session system. Nothing reads them any more; you can drop them. |

## Configuration

[`.env.example`](../.env.example) is a useful starting point, but it describes a
*development* environment: it sets `NODE_ENV` (which the backend does not read —
see `ENV` below) and omits `ENV`, `TRUST_PROXY`, `POSTGRES_PASSWORD`, and
`VERSION`, all of which a production deployment needs. The variables that matter
in production:

### Backend

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Must start with `postgres://` or `postgresql://`; validated at boot |
| `BETTER_AUTH_SECRET` | yes | **At least 32 characters**, and it must not contain `change-this`, `your-secret`, or `REPLACE` — the config schema rejects placeholder secrets outright. `openssl rand -base64 48` is fine |
| `ENV` | yes | `production`. The backend's config reads `ENV`, **not** `NODE_ENV`; leaving it unset silently gives you development behaviour (pretty-printed logs, `development` as the Sentry environment, password-reset URLs written to the debug log) |
| `FRONTEND_URL` | yes | Your public HTTPS origin. Also the Better Auth trusted origin |
| `BACKEND_URL` | yes | Same origin — everything is served from one host behind nginx |
| `BETTER_AUTH_URL` | for MCP OAuth | Your public HTTPS origin. See [Connecting AI assistants](#connecting-ai-assistants-mcp) |
| `TRUST_PROXY` | behind a proxy | `true` so rate limiting uses the real client IP from `X-Forwarded-For` |
| `WEBAUTHN_RP_ID` | for passkeys | Bare domain, e.g. `freundebuch.example.com` |
| `NOMINATIM_CONTACT_EMAIL` | recommended | OSM's usage policy wants a contact address; without one, geocoding may get rate-limited |
| `LOG_LEVEL` | no | `info` by default |
| `SENTRY_DSN` | no | Error tracking, off when unset |
| `POSTGIS_ADDRESS_ENABLED` | no | Turn on only after running the OSM import — see [postgis-address-autocomplete.md](./postgis-address-autocomplete.md) |

### MCP server

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | The same database as the backend |
| `ENV` | yes | `production`. No default — the MCP server refuses to boot without it, deliberately |
| `BETTER_AUTH_SECRET` | yes | **Byte-identical to the backend's.** It co-locates a Better Auth instance to validate OAuth tokens; a different secret means every token lookup fails |
| `BETTER_AUTH_URL` | for MCP OAuth | Same value as the backend's |
| `MCP_PORT` | no | `3100` by default |

### Database

`POSTGRES_PASSWORD` has no default and must be set. `POSTGRES_DB` and
`POSTGRES_USER` both default to `freundebuch`.

## First run

```bash
cp .env.example .env        # then edit it
docker compose -f docker-compose.prod.yml up -d
```

Migrations are **not** applied automatically. The backend image ships them
compiled under `database/dist`; run them once the database is healthy, and again
after every upgrade:

```bash
docker compose -f docker-compose.prod.yml exec backend \
  node node_modules/node-pg-migrate/bin/node-pg-migrate.js \
  --decamelize --migrations-dir database/dist up
```

That is the `migrate:prod` script from the root `package.json`, spelled out so it
runs without a package manager inside the container.

Then open your domain and register the first account.

## Upgrading

```bash
# Pin VERSION in .env to the release you want, then:
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
# ...and run the migration command above.
```

Releases are cut by semantic-release on every merge to `main`, so versions move
quickly. [CHANGELOG.md](../CHANGELOG.md) is the authoritative list of what
changed.

## Connecting AI assistants (MCP)

The MCP endpoint is `https://your-domain/mcp`, speaking Streamable HTTP. Two ways
to authenticate:

- **App password (Basic auth)** — works everywhere, no extra configuration.
  Create one under *Profile → App Passwords*.
- **OAuth 2.1** — required by remote connectors such as claude.ai, which
  register themselves dynamically and will not accept a static credential.

For OAuth you must set `BETTER_AUTH_URL` to your public HTTPS origin **on both
the backend and the MCP server**. It becomes the OAuth issuer and the RFC 9728
resource audience; if the two disagree, or either disagrees with the origin the
client actually reached, discovery fails rather than degrading quietly.

The nginx config already exposes the discovery documents at the origin root,
where clients probe for them:

```
/.well-known/oauth-authorization-server
/.well-known/openid-configuration
/.well-known/oauth-protected-resource
/.well-known/oauth-protected-resource/mcp
```

Verify a deployment with:

```bash
curl -s https://your-domain/.well-known/oauth-authorization-server | jq .issuer
```

The `issuer` must equal your public origin. If it comes back as something else,
`BETTER_AUTH_URL` is wrong or not reaching the backend container.

Per-client setup instructions (claude.ai, Claude Desktop, Claude Code, generic
clients) live in the app itself, under *Profile → MCP*, with your own URL already
filled in. For how the tokens work, see
[security-authentication.md](./security-authentication.md#oauth-21-access-tokens-mcp)
and [ADR 0001](./decisions/0001-better-auth-as-oauth-server-for-mcp.md).

## CalDAV/CardDAV

Sync is served at `https://your-domain/carddav/` and `/caldav/`, with
`/.well-known/carddav` and `/.well-known/caldav` redirecting there for clients
that autodiscover. Clients authenticate with an app password, not the account
password — see [security-authentication.md](./security-authentication.md#app-passwords-caldavcarddav).

## Address autocomplete

PostGIS-backed address lookup needs a one-off OpenStreetMap import (the
`osm-import` profile) before `POSTGIS_ADDRESS_ENABLED` does anything. The full
procedure, including data volume sizing, is in
[postgis-address-autocomplete.md](./postgis-address-autocomplete.md).

## Backups

Two volumes hold state you cannot regenerate:

| Volume | Contents |
|--------|----------|
| `postgres_data` | Everything — friends, encounters, accounts, passkeys, OAuth grants |
| `freundebuch_uploads` | Uploaded photos (mounted at `/app/uploads` in the backend) |

`osm_data` only caches downloaded PBF files and is safe to lose.

Back up the database with `pg_dump` against the `postgres` container rather than
copying the volume while it is running.

## Health checks

Every service defines a Docker healthcheck, so `docker compose ps` shows real
status. Manually:

| Endpoint | Serves |
|----------|--------|
| `https://your-domain/health` | nginx |
| `http://backend:3000/health` | Backend (internal network) |
| `http://mcp-server:3100/health` | MCP server (internal network) |

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Backend exits at boot with a config validation error | `BETTER_AUTH_SECRET` is under 32 characters or still contains a placeholder phrase |
| MCP server exits at boot | `ENV` is unset — it has no default on purpose |
| Logs are pretty-printed and colourful in production | `ENV` is not `production` on the backend |
| Passkey registration fails | `WEBAUTHN_RP_ID` is missing or does not match the browser's origin |
| claude.ai cannot connect, but Claude Desktop with an app password can | OAuth discovery — check the `issuer` with the `curl` above, and that both containers share `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` |
| MCP bearer tokens are always rejected | The MCP server's `BETTER_AUTH_SECRET` differs from the backend's, or it points at a different database |
| Rate limiting throttles everyone at once | `TRUST_PROXY` is unset, so every request looks like it comes from the proxy |
