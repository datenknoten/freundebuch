# Git Workflow

This document covers the branching model, commit conventions, and git hooks used in the Freundebuch repository. Whether you're a human contributor onboarding for the first time or an AI agent generating commits, this is the reference you need before touching version control.

## Branching Model

We use **trunk-based development** with `main` as the single permanent branch.

The core idea is simple: keep the integration surface small. Long-lived branches accumulate divergence and make merges painful. Short-lived branches (ideally resolved within a day) keep things clean.

### Rules

- `main` must always be deployable - even if a feature is unfinished, it should be hidden behind a flag, not stuck in an open branch
- Feature branches are fine for isolated work, but merge them quickly
- No strict naming convention is enforced for branches, but descriptive names like `feat/circle-filtering` or `fix/auth-token-refresh` make the history readable
- Do not create branches off other feature branches - always branch from `main`

## Why Commit Quality Matters

Every commit that lands on `main` is automatically picked up by semantic-release to generate tags, version bumps, and changelogs. Your commit messages become the release notes. A sloppy `git log` means sloppy release notes, so the bar for what hits `main` is high: each commit should tell a clear, self-contained story.

This is why **rebasing and force-pushing feature branches is not just acceptable, it's encouraged**. Treat your feature branch as a draft. Rewrite, squash, reorder, and clean up commits as many times as you need before merging. The goal is a branch that reads like a polished series of logical steps, not a play-by-play of your working process. Nobody needs to see "fix typo" and "actually fix the thing" in the final history.

## Commit Conventions

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) format. This is enforced automatically by a `commit-msg` hook, so non-conforming commits will be rejected before they land.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

The description should be sentence case, imperative mood, and not end with a period. Think "Add circle filtering" not "Added circle filtering."

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting, whitespace - no logic change |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature |
| `perf` | A change that improves performance |
| `test` | Adding or updating tests |
| `build` | Changes to build system or dependencies |
| `ci` | Changes to CI configuration files and scripts |
| `chore` | Other changes that don't modify src or test files |
| `revert` | Reverts a previous commit |

### Scopes

| Scope | Covers |
|-------|--------|
| `all` | Affects everything |
| `backend` | `apps/backend` (Node/Express) |
| `frontend` | `apps/frontend` (SvelteKit) |
| `shared` | `packages/shared` |
| `database` | Database migrations and schema |
| `docs` | Documentation files |
| `deps` | Dependency updates |
| `config` | Configuration files |
| `ci` | CI/CD configuration |
| `dx` | Developer experience |
| `release` | Semantic-release automated commits |

A commit that touches multiple scopes usually means it should be split into separate commits.

### Examples

```
feat(frontend): Add circle filtering to friend list
fix(backend): Handle missing email in registration flow
refactor(shared): Extract date formatting utilities
docs: Add git workflow guide
chore(ci): Update Node to v24
```

### Breaking Changes

Breaking changes go in the commit footer:

```
feat(backend): Replace session tokens with JWTs

BREAKING CHANGE: existing sessions are invalidated on deploy
```

### What to Avoid

- ✅ `fix(backend): Resolve null pointer in auth middleware`
- ❌ `fixed stuff`
- ❌ `WIP`
- ❌ `update`
- ❌ `misc changes`

Vague commit messages make `git log` and release notes useless. Be specific about what changed and why.

## Git Hooks (hk)

Hooks are managed by [hk](https://hk.jdx.dev), installed automatically by the `mise install` postinstall step (or by `aube install` if hk is already on `PATH`). The hook definitions live in [`hk.pkl`](../hk.pkl). hk replaces the older Husky + lint-staged setup and runs steps in parallel with read/write file locking.

To install (or reinstall) the hooks manually:

```bash
mise run hk install --mise   # or: hk install --mise
```

Set `HK=0` on a single command to bypass hooks (e.g. `HK=0 git commit ...`). Reach for this only as a last resort.

### Pre-commit

Runs against staged files with auto-fix enabled. Steps are scoped by file glob, mirroring the prior lint-staged config:

| File pattern | Step | What runs |
|---|---|---|
| `*.{js,ts,tsx,jsx,svelte,css,json,jsonc}` | `biome` | `biome check` (with `--write` on failure) |
| `apps/frontend/**/*.{ts,js,svelte}` | `frontend-type-check` | `aube --filter frontend run type-check` |
| `apps/backend/**/*.{ts,js}` | `backend-type-check` | `aube --filter backend run type-check` |
| `packages/shared/**/*.{ts,js}` | `shared-build` | shared package build + root `aube type-check` |

There is no per-app build step in pre-commit; full builds run only on pre-push. Auto-fixed files are restaged automatically. Type errors block the commit.

### Commit-msg

Runs `aube commitlint --edit <commit-msg-file>`. Non-conforming messages are rejected with a clear error.

### Pre-push

Mirrors CI - if this passes locally, the pipeline should too. Steps are wired with explicit `depends` in `hk.pkl` so they always run in this order:

1. **danger** - `npx danger local --base main`
2. **check** - `aube check` (Biome lint + format across the whole codebase)
3. **type-check** - `aube type-check` (all TypeScript workspaces)
4. **test** - `aube --recursive run test` across all workspaces
5. **test-php** - `apps/sabredav` PHPUnit suite (installs Composer deps if missing)
6. **build** - `aube build` (full workspace build verification)

### Running hooks ad-hoc

```bash
hk run pre-commit            # exactly what `git commit` would run
hk check                     # all linters in check-only mode
hk fix                       # all linters with auto-fix
hk check --all               # check the whole repo, not just staged files
```

## Keeping History Clean

Since the `git log` on `main` directly feeds into release notes and changelogs, a clean history is a project-level concern, not just a personal preference.

### Rebase Freely on Feature Branches

Your feature branch is your workspace. Rebase it, rewrite commits, squash WIP commits, reorder things - whatever it takes to produce a clean, logical sequence before merging to `main`. There is no expectation of a stable history on feature branches. Force-push as often as you need.

### Small, Focused Commits

Each commit should do one thing. A commit that touches the database schema, updates the backend route, and adjusts the frontend component is three commits pretending to be one. Reviewers and future readers of `git log` will thank you - and so will semantic-release, which maps each commit to a changelog entry.

### Amending Non-HEAD Commits

If you need to amend a commit that isn't the most recent one, use fixup commits and autosquash rather than an interactive rebase by hand:

```bash
# Create a fixup commit targeting a specific SHA
git commit --fixup=<sha>

# Autosquash it into the target commit
GIT_SEQUENCE_EDITOR=true git rebase --autosquash <sha>~1
```

This approach is safer and less error-prone than manually reordering an interactive rebase.

### Force Pushing

When rewriting history on a feature branch, always use `--force-with-lease` instead of `--force`:

```bash
git push --force-with-lease
```

`--force-with-lease` refuses to overwrite commits that have appeared on the remote since your last fetch. It's a safety net against accidentally discarding someone else's work.

Never force-push to `main`.

## Automated Releases

semantic-release runs on every push to `main`. It scans the commit history since the last release, generates a version bump, creates a git tag, and publishes a changelog. The `chore(release): <version>` commits you see in the log are created by this process - do not create them manually.

Because semantic-release reads your commits to build release notes, the quality of your commit messages directly determines the quality of the release. This is the main reason we care about clean, well-scoped conventional commits.

The release type is determined by commit types:
- `feat` triggers a minor version bump
- `fix` or `perf` triggers a patch bump
- `BREAKING CHANGE` in a footer triggers a major bump

## PgTyped Generated Files

When you edit or create a `.sql` query file, a Claude Code hook automatically runs `aube pgtyped` to regenerate the corresponding `.queries.ts` file. These generated files must be committed alongside the SQL changes - they are not gitignored.

If pgtyped appears to have skipped regeneration (the `.queries.ts` file is unchanged when it should have updated), delete the file and re-run `aube pgtyped` manually:

```bash
rm apps/backend/src/models/queries/<name>.queries.ts
aube pgtyped
```

Then stage both the `.sql` and the regenerated `.queries.ts` before committing.

## Summary Checklist

Before pushing a branch or a commit sequence to `main`:

- [ ] All commits follow Conventional Commits format with a valid type and scope
- [ ] Each commit is focused on a single logical change
- [ ] The pre-push hook passed (Biome, type-check, tests, build)
- [ ] Any amended commits used `--fixup` + `--autosquash`, not manual rebase editing
- [ ] Force pushes (if any) used `--force-with-lease`
- [ ] Generated `.queries.ts` files are committed alongside their `.sql` sources
- [ ] `main` is deployable with the new code included

---

**See also:**
- [docs/development.md](./development.md) - Common commands and code quality tooling
- [docs/database-conventions.md](./database-conventions.md) - SQL and migration conventions
