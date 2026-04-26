# Development Workflow

## Trunk-Based Development

This project follows **trunk-based development**:

- Commit directly to `main` or use very short-lived feature branches (< 1 day)
- Use **feature flags** to hide incomplete features in production
- Keep commits small and focused - integrate multiple times per day
- All code on `main` must be deployable (even if features are hidden behind flags)
- CI runs on every commit to `main`

## Toolchain

Tool versions are managed by [mise](https://mise.jdx.dev). With mise installed and activated in your shell, two commands bootstrap everything:

```bash
mise install        # installs node, aube, hk, pkl (versions pinned in mise.toml)
aube install        # installs JS dependencies from pnpm-lock.yaml
```

`mise install` also runs hk's `postinstall` hook, which installs the git hooks defined in [`hk.pkl`](../hk.pkl). See [git-workflow.md](./git-workflow.md#git-hooks-hk) for the hook layout.

The list of pinned tools lives in [`mise.toml`](../mise.toml). Use `mise.local.toml` (gitignored) for personal overrides.

### Package Manager: aube

This repo uses [aube](https://github.com/endevco/aube), a fast Node.js package manager that reads and writes `pnpm-lock.yaml` in place. The CLI is pnpm-compatible: `aube install`, `aube --filter <pkg> run <script>`, `aube --recursive run <script>`, `aube ci`, etc.

```bash
aube install          # install deps
aube ci               # frozen-lockfile install (used in CI)
aube add <pkg>        # add a dependency
aube <script>         # run a root-level package.json script
aubr <script>         # = aube run <script>, auto-installs if deps are stale
```

pnpm itself is not installed by mise; `aube` is the only supported runner. The lockfile remains `pnpm-lock.yaml` so contributors using pnpm directly out of habit will not break it, but all documented commands assume aube.

### Composite tasks via mise

mise hosts only orchestration tasks (composite, multi-tool, or environment-bound). For 1:1 script aliases use `aube <script>` directly.

```bash
mise tasks            # list every mise task with its description
mise run setup        # first-time install (JS + PHP deps + git hooks)
mise run ci           # mirror CI: check + type-check + test + build
mise run db:reset     # drop + recreate dev DB, run migrations + seed
mise run docker:up    # start docker services
mise run db:psql      # open psql shell on dev database
```

## Common Commands

```bash
# Development
aube dev                    # Run all workspace dev scripts concurrently
aube build                  # Build all workspaces

# Testing
aube test                   # Run all tests across workspaces
aube test:unit              # Run unit tests (Vitest)
aube test:integration       # Run integration tests (Vitest)
aube test:e2e               # Run E2E tests (Playwright)

# Code Quality
aube check                  # Run Biome check (lint + format)
aube lint                   # Run Biome linter
aube format                 # Run Biome formatter
aube type-check             # Run TypeScript compiler

# Database
aube migrate                # Run database migrations
aube migrate:create         # Create new migration
aube pgtyped                # Generate TypeScript types from SQL queries
aube pgtyped:watch          # Watch and regenerate types
aube seed                   # Seed database with test data

# Docker
aube docker:up              # Start Docker services
aube docker:down            # Stop Docker services
```

## Git Conventions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Scopes:** `frontend`, `backend`, `shared`, `db`, `ci`, `docs`

### Examples

```
feat(frontend): Add contact search component
fix(backend): Handle null email in user creation
docs: Update API documentation
chore(ci): Add semantic-release workflow
```

## Code Quality

### Biome

Single tool for linting and formatting (replaces ESLint + Prettier):

- Auto-fix on save (configure your editor)
- Git hooks (hk) run checks before commit
- Pre-push hooks run all tests

### Type Safety

- TypeScript strict mode enabled across all workspaces
- No `any` types - use `unknown` and narrow appropriately
- ArkType for runtime validation at API boundaries
- PgTyped for type-safe SQL queries

## Testing Requirements

- Test coverage target: >80%
- All tests must pass before merging
- Write tests for new features and bug fixes
- Integration tests for API endpoints
- E2E tests for critical user flows
