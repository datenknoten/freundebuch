---
status: accepted
date: 2026-09-19
---

# Bundle Renovate updates into one merge request and hold majors for approval

## Context and Problem Statement

With the move to GitLab ([ADR 0005](./0005-host-repository-and-ci-on-gitlab.md)) Renovate
stops being the Mend GitHub app and becomes a self-hosted runner in
`datenknoten/renovate-runner`. The old configuration split updates across three groups —
non-major, devDependencies, and `@types/*` — and let every advisory open its own branch.
A dry run against this tree (`renovate --platform=local --dry-run=full`, renovate 44.103.2)
put 16 merge requests on the table: 5 grouped ones and 11 vulnerability branches.

A merge request here is not cheap. Its pipeline runs `checks` (biome, type-check, build, the
full test suite with testcontainers), `php`, `pgtyped-drift`, `migrations`, two audits,
`danger`, and `docker-smoke`, which builds four production images. Sixteen of those every
Monday is a bill nobody reads, and an update nobody reviews still costs it again next week
when the bot pushes a newer version into the same branch.

## Considered Options

* One merge request for everything without a major bump, majors on dashboard approval
* Keep one merge request per dependency group, run the bot less often
* Automerge patch and digest updates

## Decision Outcome

Chosen option: "one merge request for everything without a major bump", because the cost is
per merge request, not per bot run. Running the bot fortnightly would halve the cheap half of
the bill and delay security fixes; grouping removes the expensive half outright.

* Everything `minor`, `patch`, `digest`, `pin`, `pinDigest`, plus `lockFileMaintenance`, lands
  in `renovate/all-minor-patch`.
* `major: { dependencyDashboardApproval: true }` keeps major bumps in the dependency dashboard
  as checkboxes. A major in this repo is hand work — it wants a changelog read and usually a
  code change — so it should cost a pipeline when someone decides to do it, not before.
* Vulnerability alerts group into `renovate/security` with their own label and without
  dashboard approval, so a security fix is never waiting on a checkbox and is never mixed
  into an unrelated bump that is hard to merge.
* `rebaseWhen: "conflicted"`, explicitly. On GitLab, Renovate's default `auto` resolves to
  `behind-base-branch` whenever the project's merge method is not `merge`, and this project
  merges fast-forward. Left at the default, every commit to `main` would repush every open
  Renovate branch and pay a pipeline for each. The `pin` update type carries
  `behind-base-branch` as its own default and is overridden separately.
* The cadence lives only in the runner project's pipeline schedule. `renovate.json` carries no
  `schedule` key — two places naming the same rhythm is one place too many.

Same dry run after the change: 3 merge requests (`all-minor-patch`, `security`, and the
one-time `digests-pin`), 17 majors held in the dashboard.

### Consequences

* Good, because the weekly bill drops from 16 merge-request pipelines to 2 recurring ones.
* Good, because `matchPackagePatterns` disappears with the old grouping. It was removed in
  Renovate 41 and the runner image is 44, so the rule was already dead weight.
* Bad, because a grouped merge request is a grouped rollback: reverting it takes back every
  bump of that week. A single bump is then a hand-written commit on the affected line.
* Bad, because one broken dependency blocks the whole bundle until it is pinned back out.
* Bad, because majors are only visible to someone who opens the dependency dashboard. The
  dashboard belongs in the same rhythm as the review of the bundled merge request.
* Neutral, because `commitMessageLowerCase: "never"` had to be set for an unrelated reason:
  Renovate lowercases the subject when semantic commits are on, and `commitlint.config.mjs`
  fails `subject-case` on that, which Danger turns into a hard failure on every bot merge
  request.
