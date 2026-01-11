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

See [docs/development.md](docs/development.md) for full list.

```bash
# Database (run from root)
pnpm migrate:create <name>    # Create new migration
pnpm migrate                  # Run pending migrations
pnpm pgtyped                  # Generate types from SQL

# Development
pnpm dev                      # Run all dev servers
pnpm check                    # Lint + format
pnpm test                     # Run all tests

# Docker
pnpm docker:up                # Start database
pnpm docker:down              # Stop database
```

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
