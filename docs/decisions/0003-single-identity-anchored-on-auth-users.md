---
status: accepted
date: 2026-09-06
---

# Anchor one user identity on `auth.users.external_id`

## Context and Problem Statement

The migration to Better Auth ([ADR 0001](0001-better-auth-as-oauth-server-for-mcp.md))
was never finished. It left the database with **two** user tables:

- `auth.users` — the pre-Better-Auth table: `SERIAL id`, `uuid external_id`,
  `email`, `password_hash`, `preferences`, `self_profile_id`. Eleven domain
  tables carry an integer FK to its `id` (`friends.friends`,
  `friends.circles`, `friends.friend_changes`, `friends.search_history`,
  `encounters.encounters`, `collectives.collectives`,
  `collectives.collective_types`, `auth.app_passwords`,
  `system.notification_channels`, plus the two legacy auth tables).
- `auth."user"` — Better Auth's table: `text id`, and after the migration also
  `self_profile_id` and `preferences`.

Nothing related the two rows except the **email address**. Every authenticated
request therefore ran a bridge query (`SELECT external_id FROM auth.users WHERE
email = $1`) to translate the session's user into the id the domain tables use,
and three consumers (backend, SabreDAV, MCP server) each had their own copy of
that join.

Making an email address load-bearing for identity had consequences beyond the
extra round trip:

- `PUT /api/users/me` wrote `auth.users.email` only. One successful request
  desynchronised the tables and the bridge query stopped matching — a permanent
  401 with no way back through the UI.
- Preferences were written to `auth."user"` but the notification digest read
  them from `auth.users`, so every digest silently fell back to English.
- A case difference between the two rows was enough to break DAV login while
  the web app kept working.

## Considered Options

* Make `auth."user".id` equal `auth.users.external_id`, keeping `auth.users` as
  the FK anchor
* Migrate the eleven domain FKs to `text` and reference `auth."user".id`
  directly, then drop `auth.users`
* Add a real FK column (`auth."user".legacy_user_id`) and keep two ids
* Leave it and cache the bridge lookup

## Decision Outcome

Chosen option: **`auth."user".id = auth.users.external_id::text` for every
user**, because it removes the bridge without touching a single domain FK.

`auth.users` keeps exactly four columns — `id`, `external_id`, `created_at`,
`updated_at` — and exists only as the integer FK anchor. All identity data
(email, credentials, `self_profile_id`, `preferences`) lives on `auth."user"`.

Why not re-key the domain tables to `text`: that is eleven FK rewrites plus
wider indexes on the largest tables, against six Better Auth child FKs
(`session`, `account`, `passkey`, `oauth_application`, `oauth_access_token`,
`oauth_consent`) which can simply be given `ON UPDATE CASCADE` and follow along.
Migration `1779668100000_unify-user-identity` does exactly that, then re-keys the
Better Auth rows created *after* the original migration (whose ids are not
UUIDs) to the legacy UUID.

Allocation order is inverted to make the invariant hold from the first write:
Better Auth's `user.create.before` hook inserts the `auth.users` row and returns
its `external_id` as the new user's id. Better Auth merges that into the create
payload and inserts with `forceAllowId`.

## Consequences

- **Good:** no per-request bridge query. `authMiddleware` is one `getSession`
  call, and `AuthContext` has a single `userId` instead of `userId` +
  `betterAuthId` that callers had to choose between.
- **Good:** the email address is no longer part of identity. It can be changed
  (once a verified flow exists) without touching any other row.
- **Good:** SabreDAV and the MCP server read the address from `auth."user"` and
  join on `external_id::text = id`, so all three consumers agree by
  construction.
- **Good:** deleting a Better Auth user cascades the domain data, via a
  `user.delete.after` hook that removes the anchor row.
- **Bad:** sign-up is two writes in sequence and the first is not in Better
  Auth's transaction. A failure in between orphans an `auth.users` row; the
  hourly cleanup calls `auth.delete_orphan_legacy_users()` to reap rows older
  than a day.
- **Bad:** the invariant is a convention, not a foreign key — `auth."user".id`
  is `text` and `auth.users.external_id` is `uuid`, so Postgres cannot enforce
  it. The migration aborts on any unpaired row rather than guessing, and
  fixtures in all three test suites create both rows together.
- **Neutral:** the migration is not reversible for credentials. `down()`
  restores the columns and backfills email/preferences/self-profile from
  `auth."user"`, but `password_hash` comes back empty — Better Auth has owned
  credentials since ADR 0001.

## Operator notes

`1779668100000_unify-user-identity` raises `orphan identity rows; resolve
manually before upgrading` if either table has a row the other cannot match. Two
accounts differing only in email case must also be merged first — see
`1779668000000_lowercase-emails`.
