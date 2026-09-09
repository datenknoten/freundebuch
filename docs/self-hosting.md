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
| `ENV: production` on the backend | Now set upstream, alongside `NODE_ENV`. **Both are needed**: `ConfigSchema` reads `ENV` (default `development`), so without it you get dev logging, Sentry's production guards off, and reset links in the debug log — while `NODE_ENV` is Node's own switch that package managers and libraries branch on. Neither replaces the other. |
| `TRUST_PROXY: "true"` on the backend | Set upstream, because nginx always fronts the backend. Drop it only if you expose the backend directly, otherwise rate limiting keys off the proxy's IP instead of the client's. |
| `TRUSTED_PROXY_HOPS: "1"` on the backend | Correct for Traefik → nginx → backend *because* the bundled nginx runs the realip module and appends the resolved client to `X-Forwarded-For`. Raise it by one per extra proxy only if you set `NGINX_REAL_IP_FROM=""` on the nginx container, which turns realip off. |
| `WEBAUTHN_RP_ID` on the backend | Not set upstream. Set it to your bare domain (no scheme, no port) or passkey registration fails. |
| `BETTER_AUTH_SECRET` on the backend | Now set upstream (it was only on the mcp-server). It is required and must be the same value for both, or MCP bearer tokens are rejected. |

## Configuration

[`.env.example`](../.env.example) is a useful starting point, but it describes a
*development* environment: it sets `ENV` and `NODE_ENV` to `development` and
omits `TRUST_PROXY`, `POSTGRES_PASSWORD` and `VERSION`, all of which a
production deployment needs. The variables that matter
in production:

### Backend

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Must start with `postgres://` or `postgresql://`; validated at boot |
| `BETTER_AUTH_SECRET` | yes | **At least 32 characters**, and it must not contain `change-this`, `your-secret`, or `REPLACE` — the config schema rejects placeholder secrets outright. `openssl rand -base64 48` is fine. Not rotatable without user-visible loss — see [Rotating `BETTER_AUTH_SECRET`](#rotating-better_auth_secret) |
| `ENV` | yes | `production`. This is the one the backend's config reads; leaving it unset silently gives you development behaviour (pretty-printed logs, `development` as the Sentry environment, password-reset URLs written to the debug log) |
| `NODE_ENV` | yes | `production`. Separate from `ENV` and **not interchangeable with it**: `NODE_ENV` is Node's own switch, which package managers use to prune devDependencies and libraries use to pick dev-only warnings and slow paths. Set both |
| `FRONTEND_URL` | yes | Your public HTTPS origin. Also the Better Auth trusted origin |
| `BACKEND_URL` | yes | Same origin — everything is served from one host behind nginx |
| `BETTER_AUTH_URL` | for MCP OAuth | Your public HTTPS origin. See [Connecting AI assistants](#connecting-ai-assistants-mcp) |
| `TRUST_PROXY` | behind a proxy | `true` so rate limiting uses the real client IP from `X-Forwarded-For` |
| `TRUSTED_PROXY_HOPS` | rarely | How many proxies front the app; the client is that many entries from the right of `X-Forwarded-For`. Default `1`, which is right whenever nginx resolves the client itself (see [nginx](#nginx)). Only raise it when realip is off, e.g. `2` for Traefik → nginx |
| `WEBAUTHN_RP_ID` | for passkeys | Bare domain, e.g. `freundebuch.example.com` |
| `NOMINATIM_CONTACT_EMAIL` | recommended | OSM's usage policy wants a contact address; without one, geocoding may get rate-limited |
| `LOG_LEVEL` | no | `info` by default |
| `SENTRY_DSN` | no | Error tracking, off when unset |
| `POSTGIS_ADDRESS_ENABLED` | no | Turn on only after running the OSM import — see [postgis-address-autocomplete.md](./postgis-address-autocomplete.md) |
| `SMTP_HOST` | for password reset | Hostname of your SMTP relay. **Without it no mail is ever sent**: "forgot password" still answers 200, but the reset link only reaches the log — and only outside production. Nobody can recover an account until you configure this |
| `SMTP_PORT` | no | Defaults to `587` (`465` when `SMTP_SECURE=true`) |
| `SMTP_USER` / `SMTP_PASSWORD` | for authenticated relays | Omit `SMTP_USER` for an unauthenticated relay on your own network |
| `SMTP_FROM` | no | Envelope sender, e.g. `Freundebuch <no-reply@example.com>`. Defaults to `no-reply@<FRONTEND_URL host>`, which many relays reject — set it |
| `SMTP_SECURE` | no | `true` for implicit TLS (port 465). `false` (default) connects in the clear and upgrades via STARTTLS, which is what 587 expects |
| `DISABLE_SIGNUP` | no | `true` closes registration: `POST /api/auth/sign-up/email` returns 403 `SIGNUP_DISABLED` and the frontend hides the register link. Existing accounts are unaffected. Create your own account *before* setting it |

### nginx

| Variable | Required | Notes |
|----------|----------|-------|
| `NGINX_REAL_IP_FROM` | no | Space-separated CIDRs of the proxies in front of nginx, whose `X-Forwarded-For` it may believe. Defaults to the RFC1918 ranges (`10.0.0.0/8 172.16.0.0/12 192.168.0.0/16`) in the standalone nginx image, and to empty in the all-in-one image. nginx then rewrites `$remote_addr` to the real client, which is what the auth/DAV/MCP rate-limit zones key on and what it appends to `X-Forwarded-For` for the backend. Set it to your proxy's address to narrow the trust, or to `""` to turn realip off — then raise `TRUSTED_PROXY_HOPS` accordingly |
| `NGINX_ACCESS_LOG` | no | `off` by default; set a path such as `/dev/stdout` to enable |
| `NGINX_ERROR_LOG_LEVEL` | no | `warn` by default |

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

### Rotating `BETTER_AUTH_SECRET`

Notification-channel credentials (Telegram bot token, Matrix access token,
Discord webhook URL) are encrypted at rest with a key derived from
`BETTER_AUTH_SECRET`. The secret never enters the database, so **rotating it
makes those stored credentials undecryptable.** Nothing crashes: the channel
list keeps loading and shows `****` instead of the usual last-4 hint, but test
messages and the daily digest fail until each affected user re-enters the
credential under *Profile → Notifications*.

So rotate only when you mean to — a leaked secret, say — and tell your users to
re-save their channels afterwards. Change it in **both** the backend and the
MCP server at the same time; they must stay byte-identical.

## Connection budget

Postgres's default `max_connections` is 100 and the compose files do not raise
it, so the pools have to fit. With the shipped defaults:

| Consumer | Connections | Where it comes from |
|----------|-------------|---------------------|
| Backend, main pool | up to 10 | `DATABASE_POOL_MAX`, default `10` (`apps/backend/src/utils/config.ts`) |
| Backend, Better Auth pool | up to 5 | Better Auth needs `search_path=auth`, so it gets its own pool at half the main sizes — `max(2, ⌊DATABASE_POOL_MAX/2⌋)` (`apps/backend/src/lib/auth.ts`) |
| MCP server, main pool | up to 5 | Its own `DATABASE_POOL_MAX`, default `5` (`apps/mcp-server/src/config.ts`) |
| MCP server, Better Auth pool | up to 2 | It co-locates the backend's Better Auth instance to validate OAuth tokens, so the same halved pool is built — but from the MCP container's `DATABASE_POOL_MAX` of `5`, i.e. `max(2, ⌊5/2⌋)` |
| SabreDAV | up to 20 | One non-persistent PDO connection per busy PHP-FPM worker, and `pm.max_children = 20` (`docker/Dockerfile.sabredav.prod`) |
| **Total** | **≈ 42** | of 100, three of which Postgres reserves for superusers |

That leaves room for `psql`, `pg_dump` and a migration run. Two things to watch
when tuning:

- `DATABASE_POOL_MIN`/`DATABASE_POOL_MAX` are read by the backend **and** the
  MCP server. `docker-compose.prod.yml` passes the same `.env` value to both
  (with different fallbacks: `10` for the backend, `5` for the MCP server), so
  setting `DATABASE_POOL_MAX: 20` gives you 30 backend + 30 MCP + 20 SabreDAV
  = 80, not 42.
- Raising `pm.max_children` in a SabreDAV image raises its ceiling one
  connection at a time; DAV clients are chatty but each request is short.

The budget assumes exactly one of each container — see
[ADR 0004](./decisions/0004-single-instance-deployment.md).

## First run

```bash
cp .env.example .env        # then edit it
docker compose -f docker-compose.prod.yml up -d
```

Migrations run automatically: a one-shot `migrate` service applies the compiled
migrations from `database/dist`, and `backend` waits for it
(`service_completed_successfully`). A failed migration therefore keeps the old
backend from being replaced by one that expects a schema it did not get.

To run them by hand anyway — say, to see the SQL before it lands:

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

Then open your domain and register the first account.

## Upgrading

**Take a database dump first** (see [Backups](#backups)) — migrations are
applied automatically and some drop columns.

```bash
# Pin VERSION in .env to the release you want, then:
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

`up -d` runs `migrate` to completion before starting the new backend.

Two migrations refuse to run on data they cannot interpret rather than guessing:
`1779668000000_lowercase-emails` aborts if two accounts differ only in email
case, and `1779668100000_unify-user-identity` aborts if either user table has a
row the other cannot match. Both need a manual decision — see
[ADR 0003](./decisions/0003-single-identity-anchored-on-auth-users.md).

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
copying the volume while it is running:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -Fc -U "${POSTGRES_USER:-freundebuch}" "${POSTGRES_DB:-freundebuch}" \
  > "freundebuch-$(date +%F).dump"
```

Restore into an empty (or to-be-overwritten) database:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "${POSTGRES_USER:-freundebuch}" -d "${POSTGRES_DB:-freundebuch}" \
  --clean --if-exists < freundebuch-2026-01-01.dump
```

**Dump before every upgrade.** Migrations run automatically now and some are
destructive by design — `1779668100000_unify-user-identity` drops columns, and
its `down()` cannot restore password hashes. A dump is the only way back.

## Health checks

Every service defines a Docker healthcheck, so `docker compose ps` shows real
status. Manually:

| Endpoint | Serves |
|----------|--------|
| `https://your-domain/health` | nginx |
| `http://backend:3000/health` | Backend liveness — process is up. No database access, so a database blip never restarts a healthy container |
| `http://backend:3000/health/ready` | Backend readiness — both connection pools plus the uploads volume. 200 `{"status":"ready","checks":{"db":true,"authDb":true,"uploads":true},"signupEnabled":true,"emailEnabled":true}` or 503 with the failing check `false`. This is what the container healthcheck watches |
| `http://mcp-server:3100/health` | MCP server (internal network) |

`emailEnabled` mirrors whether `SMTP_HOST` is set and `signupEnabled` mirrors
`DISABLE_SIGNUP`, so a quick `curl` confirms both without shelling into the
container.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Backend exits at boot with a config validation error | `BETTER_AUTH_SECRET` is under 32 characters or still contains a placeholder phrase |
| MCP server exits at boot | `ENV` is unset — it has no default on purpose |
| Logs are pretty-printed and colourful in production | `ENV` is not `production` on the backend |
| Passkey registration fails | `WEBAUTHN_RP_ID` is missing or does not match the browser's origin |
| claude.ai cannot connect, but Claude Desktop with an app password can | OAuth discovery — check the `issuer` with the `curl` above, and that both containers share `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` |
| MCP bearer tokens are always rejected | The MCP server's `BETTER_AUTH_SECRET` differs from the backend's, or it points at a different database |
| Rate limiting throttles everyone at once | `TRUST_PROXY` is unset, so every request looks like it comes from the proxy — or `TRUSTED_PROXY_HOPS` does not match your chain, so the key is an inner proxy's address rather than the client's. With the bundled nginx resolving the client (`NGINX_REAL_IP_FROM`), `1` is correct even behind Traefik |
| Notification channels show `****` and digests stop arriving | `BETTER_AUTH_SECRET` changed, so the stored channel credentials no longer decrypt — users must re-enter them, see [Rotating `BETTER_AUTH_SECRET`](#rotating-better_auth_secret) |
| Password-reset mails never arrive | `SMTP_HOST` is unset (nothing is sent at all), or the relay rejects the default `no-reply@<domain>` sender — set `SMTP_FROM`. Delivery failures are logged at `error` with `kind: "password-reset"` |
| Container is marked unhealthy but the app responds | `/health/ready` is failing: `curl http://backend:3000/health/ready` and look at which `checks` entry is `false` (uploads volume read-only is the usual one) |
