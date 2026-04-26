# AI Agent Guidelines

This file provides guidance for AI coding assistants working with this codebase.

## Project Summary

**Freundebuch** - A self-hostable web application for relationship management (a digital friendship book for adults). See [docs/architecture.md](docs/architecture.md) for full details and [docs/brand.md](docs/brand.md) for brand guidelines.

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/architecture.md](docs/architecture.md) | Tech stack, monorepo structure, feature roadmap |
| [docs/development.md](docs/development.md) | Workflow, commands, git conventions, testing |
| [docs/principles.md](docs/principles.md) | Core principles and design constraints |
| [docs/tone.md](docs/tone.md) | Writing style guidelines |
| [docs/design-language.md](docs/design-language.md) | Visual design system |
| [docs/database-conventions.md](docs/database-conventions.md) | Database design patterns |
| [docs/git-workflow.md](docs/git-workflow.md) | Branching model, commit conventions, git hooks |

## Subproject Guidelines

Each workspace has its own AGENTS.md with specific guidance:

- [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md) - SvelteKit, components, stores
- [apps/backend/AGENTS.md](apps/backend/AGENTS.md) - Hono, routes, database, auth
- [packages/shared/AGENTS.md](packages/shared/AGENTS.md) - Types, schemas, utilities

## GitHub

Use the `gh` CLI to interact with issues and PRs:

```bash
gh issue list                 # List open issues
gh issue view <number>        # View issue details
gh pr list                    # List open PRs
gh pr view <number>           # View PR details
```

## Quick Commands

See [docs/development.md](docs/development.md) for full list. Composite tasks live in [mise.toml](mise.toml); per-script commands run via `aube <script>`.

```bash
# Bootstrap (one-time)
mise install                  # Install pinned tools + register hk git hooks
aube install                  # Install JS dependencies

# Database (run from root)
aube migrate:create <name>    # Create new migration
aube migrate                  # Run pending migrations
aube pgtyped                  # Generate types from SQL

# Development
aube dev                      # Run all dev servers
aube check                    # Lint + format
aube test                     # Run all tests

# Docker
mise run docker:up            # Start database
mise run docker:down          # Stop database

# Hooks (managed by hk, see hk.pkl)
hk run pre-commit             # Run the pre-commit hook ad-hoc
hk check                      # Run all linters in check-only mode
hk fix                        # Run all linters with auto-fix
```

### Pre-commit hook scope

The pre-commit hook (defined in [`hk.pkl`](hk.pkl)) runs:

- **biome** — auto-fix lint + format on staged JS/TS/Svelte/CSS/JSON files
- **frontend-type-check** — `aube --filter @freundebuch/frontend run type-check` when `apps/frontend/**` is staged
- **backend-type-check** — `aube --filter @freundebuch/backend run type-check` when `apps/backend/**` is staged
- **shared-build** — build shared package + root type-check when `packages/shared/**` is staged

There is no per-app build step in the pre-commit hook; full builds run on pre-push.

## Quick Reference

### Type Safety
- TypeScript strict mode everywhere
- No `any` types - use `unknown` and narrow
- ArkType for runtime validation at API boundaries
- PgTyped for type-safe SQL queries

### Code Quality
- Biome for linting and formatting
- Test coverage target: >80%
- All tests must pass before merging

### Implementation Plans
Detailed implementation plans are in `project-management/epics/`.
