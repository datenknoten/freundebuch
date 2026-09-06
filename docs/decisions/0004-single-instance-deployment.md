---
status: accepted
date: 2026-09-06
---

# Run the backend as a single instance

## Context and Problem Statement

Several parts of the backend hold state in the process rather than in Postgres:

- **Schedulers.** `utils/scheduler.ts` registers `node-cron` jobs in-process —
  an hourly cleanup and the daily date digest that pushes to Telegram, Matrix
  and Discord.
- **Rate limiters.** `middleware/rate-limit.ts` uses
  `rate-limiter-flexible`'s `RateLimiterMemory`, so every bucket is per-process.
- **Uploads.** Friend photos are written to `UPLOAD_DIR` on local disk, backed
  by the `freundebuch_uploads` volume.
- **Compose identity.** Both compose files pin `container_name`, which Docker
  requires to be unique — the files cannot describe more than one replica of a
  service even by accident.

None of this is a problem today because the deployment *is* one backend
container, but the assumption was never written down. Someone scaling the
backend to two replicas to "get some headroom" would get a subtly broken
system, not a faster one, and nothing in the repo would have told them.

## Decision Outcome

Chosen option: **keep a single backend instance, and treat that as a design
constraint rather than an accident.** `deploy.replicas` must stay 1; the same
holds for any orchestrator's equivalent (`replicas`, `scale`, HPA `minReplicas`).

What breaks with a second replica, concretely:

- **Digests are sent twice.** Every replica's cron fires at the notify time and
  each reads the same due channels. The only guard is `last_notified_date`,
  written *after* a successful send (`utils/scheduler.ts`), so two replicas
  that read the due set in the same minute both send before either marks the
  channel — and users get the digest twice.
- **Rate limits multiply by the replica count.** With two replicas and
  round-robin balancing, a client gets roughly twice its configured points
  before being blocked, and blocks are not shared. The nginx `limit_req` zones
  stay correct (nginx fronts everything), so the auth and DAV limits still
  hold — the application's own per-client limits do not.
- **Photos 404 half the time.** An upload lands on the disk of the replica that
  served the request; a later `GET /api/uploads/...` routed to the other replica
  finds nothing. Unless the volume is shared, this is a data-loss-shaped bug
  rather than a cache miss.

## Consequences

- **Good:** no distributed coordination anywhere in the backend. No leader
  election, no locking, no external cache — the components that would need it
  are simply not duplicated.
- **Good:** rate limiting and cron are cheap and have no failure mode of their
  own; a limiter cannot be unavailable.
- **Bad:** the backend is a single point of failure and restarts are visible to
  users. `restart: unless-stopped` plus a fast boot is the whole answer.
- **Bad:** vertical scaling only. The Node process gets one CPU's worth of
  request handling; the connection budget in
  [self-hosting.md](../self-hosting.md#connection-budget) is sized for exactly
  one backend, one MCP server and one SabreDAV pool.

## Escape hatches, if a second replica is ever needed

Not implemented — listed so the work is known rather than discovered:

- **Cron:** wrap each job in a Postgres advisory lock
  (`pg_try_advisory_lock(<job id>)`, released on completion) so only one replica
  runs it, or elect a leader and let only that replica schedule.
- **Rate limits:** swap `RateLimiterMemory` for `RateLimiterPostgres` from the
  same library — it keeps buckets in a table, so the limits become
  deployment-wide. Every limiter is constructed in `middleware/rate-limit.ts`,
  so it is a one-module change.
- **Uploads:** move to object storage (S3-compatible), serving photos by
  redirect or proxy instead of reading them off the uploads volume. A shared
  network volume is the cheaper variant and is enough while writes stay
  per-file, as they are today.
- **Compose:** drop `container_name` from the backend service before scaling
  anything.
