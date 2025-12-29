# Development Workflow

## Trunk-Based Development

This project follows **trunk-based development**:

- Commit directly to `main` or use very short-lived feature branches (< 1 day)
- Use **feature flags** to hide incomplete features in production
- Keep commits small and focused - integrate multiple times per day
- All code on `main` must be deployable (even if features are hidden behind flags)
- CI runs on every commit to `main`

## Common Commands

```bash
# Development
pnpm dev                    # Run all workspace dev scripts concurrently
pnpm build                  # Build all workspaces

# Testing
pnpm test                   # Run all tests across workspaces
pnpm test:unit              # Run unit tests (Vitest)
pnpm test:integration       # Run integration tests (Vitest)
pnpm test:e2e               # Run E2E tests (Playwright)

# Code Quality
pnpm check                  # Run Biome check (lint + format)
pnpm lint                   # Run Biome linter
pnpm format                 # Run Biome formatter
pnpm type-check             # Run TypeScript compiler

# Database
pnpm migrate                # Run database migrations
pnpm migrate:create         # Create new migration
pnpm pgtyped                # Generate TypeScript types from SQL queries
pnpm pgtyped:watch          # Watch and regenerate types
pnpm seed                   # Seed database with test data

# Docker
pnpm docker:up              # Start Docker services
pnpm docker:down            # Stop Docker services
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
- Git hooks (Husky) run checks before commit
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
