# Backend Review — `apps/backend`

**Date:** 2026-06-13
**Scope:** Hono + PostgreSQL + PgTyped + Better Auth backend (`apps/backend/src`, ~28k LOC TS)
**Method:** Five parallel deep-dives — architecture, security, database layer, error handling/ops, testing. All findings verified against actual code.

## How to use this document

Each finding is a checklist item with a stable ID (e.g. `BUG-1`, `DUP-2`). Pick them up part by part — order is roughly by impact within each section, and the **Suggested order of attack** at the bottom sequences across sections. File:line references point at the exact code.

Legend: 🔴 high · 🟡 medium · 🟢 low

---

## 1. Bugs & correctness (do first)

- [ ] **BUG-1 🔴 `createFriend` is not transactional.** `src/services/friends/friends.service.ts:268-354`. Friend row inserted, then 7 sub-resource batches via `Promise.all` + `metInfoService.set`, every one against the pool (separate connections). Any failure leaves an orphaned partial friend while the API returns 500. Plumbing already exists: `SubResourceService.add/createMany` accept an optional `client` (`src/services/friends/base/sub-resource.service.ts:110,214`) that `createFriend` never passes. **Fix:** `db.connect()` → BEGIN → thread the client through `createMany`/`set` sequentially → COMMIT/ROLLBACK.

- [ ] **BUG-2 🔴 Friend sub-resource primary-flag race / partial write.** `src/services/friends/base/sub-resource.service.ts:106-181`. `add()` runs `countFn` → optional `clearPrimaryFn` → `createFn` as three independent pool queries. Failure between clear-primary and create leaves the friend with **no** primary; two concurrent adds both pass the `existing.length === 0` check (TOCTOU) → two primaries. Same in `update()`. The collectives twin already solved this with `withTransaction` (`src/services/collectives/sub-resources/base.service.ts:164-174`); the fix was never back-ported. **Fix:** see DUP-1 (merging the base classes fixes this for free).

- [ ] **BUG-3 🔴 No `pool.on('error')` handler — idle-client error crashes the process.** `src/utils/db.ts:130-142`. `pg.Pool` emits `'error'` for idle clients dropped by DB restart / network blip; with no listener Node treats it as an unhandled `'error'` event and the process dies. **Fix:** `rawPool.on('error', (err) => logger.error({ err }, 'Idle pg client error'))` in `createPool()`. Also add `process.on('unhandledRejection'/'uncaughtException')` (only Sentry covers this today, and only when `SENTRY_DSN` is set).

- [ ] **BUG-4 🔴 Notification scheduler misses days, never retries.** `src/models/queries/notification-channels.sql:145` — `nc.notify_time = :notifyTime::time`. Exact-minute equality: a tick delayed past the minute boundary (GC pause, restart, deploy at notify time) silently skips that day's digest; next equality match is 24h later. The comment at `src/utils/scheduler.ts:120` ("retried next minute") is therefore false. **Fix:** `nc.notify_time <= :notifyTime::time AND (last_notified_date IS NULL OR last_notified_date < :today)` — gate on the daily flag, not clock equality.

- [ ] **BUG-5 🔴 Graceful shutdown drops in-flight requests.** `src/utils/db.ts:164-179` + `src/index.ts:152`. The `serve()` handle is discarded (never `server.close()`d); `shutdown()` immediately `pool.end()`s and `process.exit(0)`s, so in-flight requests lose their DB connections mid-query. Cron tasks are never stopped. The shutdown wiring is also a fire-and-forget `import().then()` with no `.catch` (`index.ts:132-134`) — if it races/rejects, SIGTERM handling silently never installs. **Fix:** capture `const server = serve(...)`, order shutdown: stop cron → `server.close()` (drain) → `pool.end()` → exit; keep + `unref()` the 30s force-exit timer.

- [ ] **BUG-6 🔴 Health check 500s when the DB is down instead of 503.** `src/routes/health.ts:13`. `await db.connect()` sits *outside* the try block, so a down/saturated DB throws → global `onError` → `500 {"error":"Internal Server Error"}` instead of the documented `503 {status:'unhealthy', database:'disconnected'}` — exactly the scenario the endpoint exists for. **Fix:** move `connect()` inside the try, guard `client.release()` with a null check.

- [ ] **BUG-7 🟡 Relationship pairs are not atomic.** `src/services/friends/relationship.service.ts:91-116` (`addRelationship`) and `:199-217` (`deleteRelationship`). Primary insert/delete then the inverse as a second pool query. Failure between → one-way relationship or a dangling inverse edge that the network graph and `GetFriendById` still show from one side. **Fix:** one transaction each.

- [ ] **BUG-8 🟡 Cron jobs have no overlap protection.** `src/utils/scheduler.ts:66`. `node-cron` doesn't await async callbacks; a run exceeding 60s overlaps the next, and since `markChannelNotified` happens *after* dispatch (`:111`), overlap can double-send digests. `cron.schedule()` return values are discarded so jobs can't be stopped at shutdown. **Fix:** `let running = false` guard (or node-cron `noOverlap`); keep the handles for shutdown.

- [ ] **BUG-9 🟡 `checkDatabaseConnection` leaks a client on query failure.** `src/utils/db.ts:144-156`. If `client.query('SELECT 1')` throws, `client.release()` is skipped; repeated health-check failures eat the pool. **Fix:** `release()` in a `finally`.

---

## 2. Security

- [ ] **SEC-1 🟡 Overpass QL injection via unescaped `countryCode`.** `src/services/external/overpass.client.ts:138,164` interpolates `countryCode` raw into `area["ISO3166-1"="${countryCode}"]`. `city`/`postalCode`/`street` go through `escapeOverpassString()`; `countryCode` does not, and the route schema validates `country` only as `'string > 0'` (`src/routes/address-lookup.ts:79-95`). An authenticated user can inject arbitrary Overpass QL into the upstream OSM query (resource abuse, possible IP ban of the deployment, arbitrary OSM extraction). **Fix:** constrain to `^[A-Za-z]{2}$` and/or check membership in the existing `SUPPORTED_COUNTRIES`; run through `escapeOverpassString`.

- [ ] **SEC-2 🟡 Rate-limit identifier is fully client-controlled.** `src/middleware/rate-limit.ts:114-120`. `getClientIdentifier` trusts the first `X-Forwarded-For` value (then `X-Real-IP`, then `'unknown'`). Without a trusted proxy that *overwrites* the header, an attacker rotates it per request to bypass every limiter; with no headers all clients collapse to one `'unknown'` bucket. **Fix:** derive IP from the socket / a configured trusted-proxy hop count; document required reverse-proxy header hygiene.

- [ ] **SEC-3 🔴 PII shipped to Sentry in production.** `src/instrument.ts:36` forwards pino `info/warn/error` logs to Sentry (`enableLogs: true`) regardless of environment. Logged PII: user email (`src/lib/auth.ts:64`), `newEmail` (`src/routes/users.ts:100`), emails + app-password names (`src/services/app-passwords.service.ts:125,213,226,260`), friend `displayName` (`src/services/friends/friends.service.ts:269`). `sendDefaultPii` only governs request metadata, not log payloads. For a personal CRM, friends' names and users' emails land on a third party. **Fix:** log external IDs only at those call sites; add `email`, `*.email`, `displayName`, `name` to the pino `redact` list (`src/utils/logger.ts:8-17`) and/or a Sentry `beforeSendLog` scrubber. Also drop `tracesSampleRate: 1.0` (`instrument.ts:29`) for prod.

- [ ] **SEC-4 🟢 Sentry tunnel is unauthenticated and unbounded.** `src/routes/sentry-tunnel.ts:33` + `src/index.ts:89`. No auth, no rate limit, `c.req.text()` buffers an unbounded body before relaying. SSRF is properly constrained to `*.ingest.sentry.io` + numeric project ID (good), but it's a low-impact open relay toward Sentry. **Fix:** add Hono `bodyLimit` (~1MB) + a rate limiter; optionally pin to your own DSN host/project.

- [ ] **SEC-5 🟢 Defense-in-depth gap: unscoped coordinate update.** `src/models/queries/friend-addresses.sql:131` (and `collective-addresses.sql`) `UpdateAddressCoordinates` updates by `external_id` only, no owner join. Not currently exploitable (callers pass IDs already resolved through user-scoped queries — `src/services/friends/sub-resources/address.service.ts:182,228`), but it breaks the otherwise-uniform scoping pattern and is a foot-gun for reuse. **Fix:** add the `user_id`/owner join.

- [ ] **SEC-6 🟢 `GetEncounterFriendsPreview` not user-scoped.** `src/models/queries/encounters.sql:108-120` trusts the encounter UUID alone — the only API-feeding query not joined to `auth.users`. Only called with user-scoped IDs today (`src/services/friends/.../encounters.service.ts:88`), so not exploitable, but breaks the pattern. **Fix:** add the `auth.users` join like every sibling.

---

## 3. Code duplication & architecture

- [ ] **DUP-1 🔴 Two diverged copies of the sub-resource base class.** `src/services/friends/base/sub-resource.service.ts` (227 LOC, class `SubResourceService`, **no transactions**) vs `src/services/collectives/sub-resources/base.service.ts` (291 LOC, class `CollectiveSubResourceService`, **transactional via `withTransaction`**). Same config-driven CRUD, differing mainly in `friendExternalId` vs `collectiveExternalId`. Merging onto one generic base (parameterize the owner-id key) deletes a file **and** gives friends the BUG-2 transaction fix for free. The collectives base is the better template (handles rollback + release failure without masking the original error).

- [ ] **DUP-2 🟡 Eight parallel sub-resource route files are line-for-line identical.** friends vs collectives × emails/phones/urls/addresses (`src/routes/friends/sub-resources/*` ≈488 LOC, `src/routes/collectives/sub-resources/*` ≈580 LOC). **Fix:** a route factory `createSubResourceRoutes({ schema, service, notFoundError })` reclaims ~800 lines and makes the two sides provably identical.

- [ ] **DUP-3 🟡 Duplicated boilerplate across routes.** `try { c.req.json() } catch { throw ValidationError('Invalid JSON') }` appears **34×**; `instanceof type.errors` **60×**; `new <X>Service` **121×**. **Fix:** extract `parseBody(c, Schema)` helper (also fixes ARCH-2 below); consider putting constructed services on `AppContext` via middleware like `db`/`logger`.

- [ ] **ARCH-1 🟡 Four constructor styles for the same `(db, logger)` deps.** Positional `(db, logger)` (`FriendsService`, `AppPasswordsService`), options object `({ db, logger })` (sub-resource/search/relationship services), db-only `(private db: Pool)` with **no logger** (`CollectivesService:47`, `MembershipsService:49`, `CirclesService:33`, `EncountersService:40`, `CollectiveTypesService:23`), and logger-only (`PhotoService:23`). Collectives/circles/encounters services consequently can't log. **Fix:** standardize on the options object; give everyone a logger.

- [ ] **ARCH-2 🟡 Bad UUID path params 500 instead of 400/404.** `src/routes/friends/core.routes.ts:44-58,92-119,125-147` and `dashboard.routes.ts` pass the raw `:id` straight to UUID-typed queries, so `GET /api/friends/not-a-uuid` produces a Postgres cast error → 500 + Sentry noise. Sub-resource routes already guard with `isValidUuid`. **Fix:** a tiny UUID param-validator middleware on `/:id` mounts.

- [ ] **ARCH-3 🟡 Two pagination shapes.** Friends returns `{ friends, total, page, pageSize, totalPages }`; collectives returns `totalCount` (`src/services/collectives/collectives.service.ts:115-118`). **Fix:** converge on the generic `packages/shared/src/pagination.ts` shape for new endpoints.

- [ ] **ARCH-4 🟢 Untyped auth context.** `src/types/context.ts` declares only `db`/`logger`; `authMiddleware` sets `'user'`/`'session'` on an untyped context (`src/middleware/auth.ts:42-50`) and `getAuthUser` returns `c.get('user')` as `any` (`auth.ts:58-60`). Nothing stops a route from calling `getAuthUser` without the middleware. **Fix:** add optional `user`/`session` to `AppContext['Variables']`.

- [ ] **ARCH-5 🟢 External HTTP clients not injectable.** `AddressLookupService` constructs `ZipcodeBaseClient`/`OverpassClient`/`NominatimClient` internally (`src/services/address-lookup.service.ts:41-48`); only `postgisClient` is injectable. Unit-testing requires network mocking. **Fix:** accept clients via options.

- [ ] **ARCH-6 🟢 Orphaned photo cleanup in route.** `src/routes/friends/core.routes.ts:138-144` calls `PhotoService.deletePhoto()` after `deleteFriend()`; move it inside `deleteFriend` so other callers can't forget it.

---

## 4. Database layer

- [ ] **DB-1 🟡 No DB timeouts anywhere.** `src/utils/db.ts:135-139` sets `min`/`max` but no `connectionTimeoutMillis`, `idleTimeoutMillis`, `statement_timeout`, or `query_timeout`. A hung DB means requests (and `pool.connect()`) queue forever. **Fix:** `connectionTimeoutMillis: 5000`, `idleTimeoutMillis: 30000`, a `statement_timeout`. (Pairs with BUG-3/BUG-9.)

- [ ] **DB-2 🟡 N+1 in `listEncounters`.** `src/services/.../encounters.service.ts:86-94` runs `getEncounterFriendsPreview` once per encounter row (~27 queries/page at pageSize 25). The correct batch pattern already exists next door: collectives uses `getMemberPreviewBatch` with `ANY(:ids::uuid[])` (`collectives.service.ts:90-105`). **Fix:** add `GetEncounterFriendsPreviewBatch` (window function `ROW_NUMBER() OVER (PARTITION BY encounter_id ...) <= 3`).

- [ ] **DB-3 🟡 44 live `varchar(n)` columns violate the TEXT convention.** From early migrations (`1766654679106_contacts-schema`, `1767200000000_carddav-support`, `1769981351000_collectives-subresources`): `friends.friends`, `friend_phones/emails/addresses/urls`, `friend_changes`, all `collective_*` sub-resources, `auth.app_passwords`. **Fix:** one `ALTER ... TYPE text` migration — metadata-only in Postgres, no table rewrite.

- [ ] **DB-4 🟢 Redundant duplicate indexes.** Every table carries both the `external_id` UNIQUE-constraint index and a second explicit `idx_*_external_id` on the same column (verified live). Pure write overhead. **Fix:** drop the `idx_*_external_id` duplicates.

- [ ] **DB-5 🟢 Soft-deleted friends accumulate forever.** Friends/collectives soft-delete (`deleted_at`) but the cleanup scheduler only handles sessions/tokens/cache — nothing purges soft-deleted rows. The soft/hard-delete mix (encounters, users, sub-resources hard-delete) is also undocumented in `database-conventions.md`. **Fix:** add a purge job and/or document the policy.

- [ ] **DB-6 🟢 Cache `delete()`/`clear()` only touch the memory tier.** `src/utils/cache.ts:211-220` — a key "deleted" in memory resurrects from the DB tier on next `get()`. No caller invalidates manually today, but the API is misleading. Also a validation-failed entry (`:144-149`) is left in the DB to be re-read and re-rejected every miss until TTL. **Fix:** delete the DB row too, or document the asymmetry.

---

## 5. Error handling, observability & ops

- [ ] **OBS-1 🟡 Sentry double-capture + 4xx noise.** `src/middleware/sentry.ts:58-66` `captureException`s everything bubbling out of `next()` — including `ValidationError`/404/400 — then rethrows; `src/index.ts:107` captures non-AppErrors a second time. Meanwhile 500-class AppErrors are captured only by the middleware, not `onError`. **Fix:** make `onError` the single capture point — capture only `!isAppError || statusCode >= 500`; remove the middleware capture.

- [ ] **OBS-2 🟡 No production access logs; request ID never reaches the client.** `src/middleware/http-logger.ts:19` logs at `debug`, but default `LOG_LEVEL` is `info` (`src/utils/config.ts:38`) → zero HTTP access logging in prod. The per-request `requestId` (`src/index.ts:51`) is never set as a response header nor on the Sentry scope. **Fix:** log completed requests at `info` (`debug` for `/health`); `c.header('X-Request-Id', id)`; `Sentry.setTag('request_id', id)`.

- [ ] **OBS-3 🟢 Upstream error bodies echoed to clients.** `NotificationDeliveryError` embeds raw response text from Matrix/Discord/Telegram (`src/services/external/{matrix,discord,telegram}.client.ts`) and reaches users via `POST /api/notification-channels/:id/test` → 502 body. Authenticated/own-channel, so low. **Fix:** log the upstream body, return a generic message.

- [ ] **OBS-4 🟢 `onError` assumes the logger exists.** `src/index.ts:95` `c.get('logger')` is undefined if an error fires before the context middleware. **Fix:** module-level fallback logger.

- [ ] **OBS-5 🟢 `ENV` vs `NODE_ENV` split-brain.** Config validates `ENV` (`config.ts:20`) but `rate-limit.ts:6` reads `NODE_ENV === 'test'` and `instrument.ts:20` reads `ENV` raw. **Fix:** pick one (or map them in config). Also `DATABASE_URL: 'string'` (`config.ts:15`) has no URL-shape validation.

---

## 6. Testing

- [ ] **TEST-1 🔴 Authorization coverage is too thin for a multi-tenant app.** Exactly one cross-user test for friends (`tests/integration/friends.test.ts:546-567`, GET only), one for app-passwords revoke, one for search isolation. No cross-user PUT/DELETE for friends, sub-resources, photos, circles, encounters, collectives, notification-channels. IDOR is the worst plausible bug class here. **Fix:** an authz sweep — `createAuthenticatedUser` already exists, so it's cheap.

- [ ] **TEST-2 🔴 `src/routes/collectives.test.ts` is fake coverage.** 446 LOC where auth is mocked to always return null, so every test hits the 401 wall; "validation" asserts `expect([400, 401]).toContain(res.status)` — passes regardless. Collectives (CRUD + transactional `memberships.service.ts`) are effectively untested. **Fix:** delete it, write a real `tests/integration/collectives.test.ts`.

- [ ] **TEST-3 🟡 Zero-coverage route groups.** `encounters`, `circles`, `uploads`, `users`/onboarding, `notification-channels`, `sentry-tunnel`, plus friend sub-resources `dates`/`relationships`/`encounters`/`met-info`/`professional-history`/`social-profiles` and `dashboard`/`organization` routes. Both transactional domains beyond friends (encounters, circles, memberships) have **no** rollback-on-failure verification. **Fix:** prioritize encounters + circles (transactions) and uploads + sentry-tunnel (high blast radius).

- [ ] **TEST-4 🟡 Test runtime tax.** One PostGIS container + full migration run **per integration file** (9 files), `fileParallelism: false` → sequential. No `globalSetup`/template-DB reuse. `cleanupFriends` (`tests/helpers/friends.helpers.ts:112-153`) hand-deletes only 4 tables — will silently leak rows (dates, relationships, encounters, recent searches). **Fix:** shared container via `globalSetup` or a template database; replace cleanup with `TRUNCATE ... CASCADE` (excluding self-profiles).

- [ ] **TEST-5 🟢 Coverage tooling is dead.** `@vitest/coverage-v8` isn't installed, no `test:coverage` script, no thresholds — `vitest.config.ts:12-16` coverage config is dead weight. `test:unit` runs integration tests too (no fast unit loop). `silent: true` hides failing-test output. **Fix:** install coverage + thresholds; split unit vs integration; `silent: 'passed-only'`.

---

## 7. Cleanup (dead code & docs)

- [ ] **CLEAN-1 🟢 Dead legacy auth code.** `src/utils/auth.ts` (legacy bcrypt `hashPassword`/`verifyPassword`, no importers); legacy `auth.users` mutators `CreateUser`/`UpdateUserPassword`/`DeleteUser`/`GetUserByEmail` (`src/models/queries/users.sql`, no callers); `jsonwebtoken` + `@types/jsonwebtoken` in `package.json` (unused). **Fix:** delete all three; shrinks attack surface.

- [ ] **CLEAN-2 🟢 Deprecated shims still imported.** `src/services/friends.service.ts` and `src/routes/friends.ts` are 5-line `@deprecated` re-export shims, still imported from `routes/users.ts:15`, `routes/uploads.ts:6`, `src/index.ts:20`. **Fix:** update 3 imports, delete both shims.

- [ ] **CLEAN-3 🟢 Unused test deps + dead test file.** `supertest` + `@types/supertest` never imported (tests use Hono `app.fetch`/`app.request`); `tests/app.test.ts` is entirely `describe.skip` ("sikp" typo). **Fix:** remove deps + file.

- [ ] **CLEAN-4 🟢 Terminology violations.** `ContactNotFoundError` (`src/utils/errors.ts:158`) and `DuplicateMembershipError` message "Contact is already a member..." (`:292`) violate the "Friend, not Contact" convention.

- [ ] **CLEAN-5 🟢 `AGENTS.md` is stale and misleads contributors.** `apps/backend/AGENTS.md:81-92` documents a per-route `isAppError` try/catch pattern that **0 of 34** route files use (all rely on global `onError` — the better design); `:114-115` documents nested `{ error: { code, message } }` but the wire format is flat `{ error, code?, details? }`; `:101-106` still describes JWT/bcrypt auth (superseded by Better Auth, Epic 18). **Fix:** rewrite those three sections to match reality.

---

## What's done well (keep / use as templates)

- **Tenancy enforced in SQL** — nearly every query joins `auth.users` on `external_id = :userExternalId`. No reachable IDOR found. Internal SERIAL ids never leak; UUID `external_id` everywhere.
- **Error architecture** — `AppError` hierarchy + single global `onError` (`src/index.ts:94-111`); routes just throw, severity-aware logging, no stack-trace leakage. The remaining per-route try blocks are all intentional.
- **Upload hardening in depth** — UUID + ownership checks, filename allowlist, `isPathWithinBase`, sharp real-image validation, 5MB cap, resize bounds, `Cache-Control: private` (`src/routes/uploads.ts`, `src/services/photo.service.ts`).
- **PgTyped discipline** — zero string-built SQL, no `SELECT *`, ILIKE wildcard escaping, `ts_headline` XSS sanitizer (`src/utils/security.ts`).
- **DB stack-trace enrichment** (`src/utils/db.ts:14-128`) — splices the call-site into async pg error stacks; solves a real pg pain point.
- **Config fail-fast** (`src/utils/config.ts`) — ArkType-typed, strips unknown keys, secret regex rejects placeholder values ≥32 chars.
- **`json_agg` embedding** in `GetFriendById`/`GetFriendsByUserId` kills the detail-page N+1 in one round trip, with runtime validation of the JSON payloads (`src/utils/db-json-schemas.ts`).
- **The collectives sub-resource `withTransaction`** and the **collectives batch-preview** pattern are the in-repo templates for fixing BUG-1/BUG-2/DB-2.
- **Test fidelity** — real PostGIS testcontainers running production migrations; auth genuinely well covered (78 integration tests); the `sanitizeSearchHeadline` XSS suite and the 1,500-LOC search suite are exemplary.

---

## Suggested order of attack

1. **Transactions & crash-safety** — BUG-1, DUP-1 (fixes BUG-2), BUG-7, then BUG-3 + DB-1 + BUG-9.
2. **Silent data loss** — BUG-4 (missed notifications), BUG-8.
3. **Shutdown & health** — BUG-5, BUG-6.
4. **Privacy & security** — SEC-3 (PII to Sentry), SEC-1 (Overpass injection), SEC-2, OBS-1.
5. **Test the risk** — TEST-1 (authz sweep), TEST-2 + TEST-3 (collectives/encounters/circles).
6. **Dedup & ergonomics** — DUP-2, DUP-3, ARCH-1, ARCH-2.
7. **Cleanup** — CLEAN-1…5, DB-3/DB-4, ARCH-3…6, remaining 🟢 items.
