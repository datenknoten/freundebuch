---
status: accepted
date: 2026-06-22
---

# Report PR test coverage via Danger instead of per-app Vitest thresholds

## Context and Problem Statement

The repo targets >80% test coverage, but nothing measured it: coverage tooling
had been flagged as dead in the 2026-06-13 backend review, and the frontend had
almost no component tests. Turning on Vitest's own `thresholds` would have
failed every workspace immediately on its historical baseline, which is a broken
build, not feedback. How do we make coverage visible on the changes that
actually matter — the files in a pull request?

## Considered Options

* A Danger rule reading per-workspace clover reports, scoped to the PR's changed
  files
* Per-app Vitest coverage thresholds failing the test run

## Decision Outcome

Chosen option: "A Danger rule", because it scores the diff rather than the
repository. New and modified files get held to 80% while the untested backlog
stays out of the way, and the result lands as a PR comment next to the existing
Danger rule set instead of as an opaque test failure.

Implementation: `packages/danger/src/rules/coverage.ts` runs
`danger-plugin-coverage` over `apps/{frontend,backend}/coverage/clover.xml` at
an 80% threshold for statements, branches, functions, and lines. The CI test job
runs with coverage and uploads the reports; the danger job downloads them first.

**Report-only, deliberately.** The plugin marks files below threshold but does
not fail the build. That is the first step, not the destination — the gate
becomes blocking (an explicit `fail()`) once the frontend backfill clears 80%.
The ~30 frontend test files added between 2026-06-22 and 2026-06-23 are that
backfill.

_This ADR was backfilled from git history (d41d4c05)._

### Consequences

* Good, because coverage feedback arrives per PR, on the changed files, without
  blocking on historical debt.
* Good, because both workspaces are wired up even though only the frontend
  report is produced today — the backend path lights up automatically once its
  report exists.
* Bad, because the gate is advisory: a PR can merge below threshold until the
  blocking `fail()` is added. This is a tracked, temporary state.
* Bad, because backend coverage is currently unmeasured — v8 instrumentation
  pushes its Better Auth integration tests past their timeout.
