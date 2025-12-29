# AI Agent Guidelines

This file provides guidance for AI coding assistants working with this codebase.

## Project Summary

**Personal CRM** - A self-hostable web application for relationship management. See [docs/architecture.md](docs/architecture.md) for full details.

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
