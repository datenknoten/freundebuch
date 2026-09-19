---
status: accepted
date: 2026-09-19
---

# Host the repository and CI on GitLab

## Context and Problem Statement

GitHub was the source of truth: GitHub Actions ran the checks, semantic-release
published GitHub Releases, six images went to `ghcr.io`, Danger commented on
pull requests, and the Mend Renovate app opened dependency PRs. Since
2026-09-05 a mirror workflow also pushed `main` and every tag to
`gitlab.com/datenknoten/freundebuch`, where a shadow pipeline re-ran the checks
and published five images to the GitLab container registry.

That left two CI systems to keep in sync for one project, and every pipeline
change had to be written twice. The project is open source and wants one place
where code review, releases, images and issues happen. Which host is it?

## Considered Options

* GitLab as the single home, GitHub reduced to a read-only mirror
* GitHub as the single home, deleting the GitLab project and its pipeline
* Keep both, accepting the permanent duplication

## Decision Outcome

Chosen option: "GitLab as the single home", because the shadow pipeline had
already proven parity on the expensive parts — checks, multi-arch builds,
keyless cosign signing against GitLab's OIDC issuer — while the GitHub side
carried the parts that are hard to reproduce elsewhere only by habit. The
GitHub repository stays alive as a push mirror so existing clones, stars and
inbound links keep working.

Implementation:

* Merge requests replace pull requests; Danger runs in the `danger` job of the
  MR pipeline against `DANGER_GITLAB_API_TOKEN`.
* semantic-release runs in the `release` job of the `main` pipeline through
  `@semantic-release/gitlab`, creating the tag, the CHANGELOG entry and a
  GitLab release with the frontend tarball attached.
* Images are published to `registry.gitlab.com/datenknoten/freundebuch/<image>`,
  signed keyless with cosign and carrying an SPDX SBOM attestation.
* Renovate runs from a separate private project, `datenknoten/renovate-runner`,
  on a schedule; it keeps reading `renovate.json` from this repository.
* GitHub keeps only the mirror: Actions, Issues and secrets are removed, and
  `.github/` is deleted from the tree.
* Merges on GitLab are fast-forward. GitHub's `main` ruleset requires linear
  history, so a merge commit would make every mirror push fail.

### Consequences

* Good, because one pipeline definition describes the whole lifecycle — checks,
  release, images — instead of two that drift.
* Good, because signing and SBOM attestation share one identity
  (`…//.gitlab-ci.yml@refs/tags/<tag>`) that verifiers can pin.
* Bad, because image names change shape: GitLab cannot express
  `freundebuch-backend` inside one project, so `ghcr.io/datenknoten/freundebuch-<svc>`
  becomes `registry.gitlab.com/datenknoten/freundebuch/<svc>`. Self-hosters must
  edit their compose files once; the old ghcr.io tags stay but stop receiving
  releases.
* Bad, because the release commit carries `[skip ci]`, which GitLab honours for
  push-sourced pipelines. The tag pipeline therefore has to be created over the
  REST API by the release job, and a failure there needs a manual "Run
  pipeline" on the tag.
* Neutral, because [ADR 0002](./0002-pr-coverage-via-danger.md) keeps applying
  unchanged — read "PR" as "MR".
* Neutral, because the 10 open GitHub issues are not migrated; they become
  invisible when the Issues feature is disabled.
