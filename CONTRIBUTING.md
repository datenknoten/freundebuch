# Contributing to Freundebuch

Thanks for your interest in contributing to Freundebuch! This guide covers everything you need to know to get started.

## Creating Issues

Before opening an issue, please search existing issues to avoid duplicates.

### Bug Reports

Include the following:

- A clear, descriptive title
- Steps to reproduce the problem
- Expected vs. actual behavior
- Browser/OS/Node version if relevant
- Screenshots or logs if applicable

### Feature Requests

- Describe the problem you're trying to solve
- Explain your proposed solution
- Consider alternatives you've evaluated

### Terminology

Use the project's domain language in issues and discussions:

- **Friend** (not "Contact")
- **Circle** (not "Group")
- **Collective** (not "Organization")

## Pull Request Workflow

Freundebuch follows a **trunk-based development** model. Keep branches short-lived and changes small.

### 1. Set Up Your Environment

```bash
# Prerequisites: Node.js 24+, pnpm 8+, PostgreSQL 18+, PHP 8.4 (for sabredav)

git clone <repo-url>
cd freundebuch2
pnpm install

# Start the database
pnpm docker:up

# Run migrations and seed data
pnpm migrate
pnpm seed

# Start all dev servers
pnpm dev
```

### 2. Create a Branch

```bash
git checkout -b feat/short-description
```

Keep branch names descriptive and short. Prefix with the commit type (`feat/`, `fix/`, `refactor/`, etc.).

### 3. Make Your Changes

- Keep commits small and focused
- Follow the commit conventions described below
- Run checks locally before pushing:

```bash
pnpm check          # Biome lint + format
pnpm type-check     # TypeScript
pnpm test           # All tests
```

### 4. Open a Pull Request

- Target the `main` branch
- Write a clear title following commit conventions
- Describe **what** changed and **why**
- Link related issues (e.g., `Closes #42`)

### 5. CI Checks

Every PR runs these checks automatically:

| Check | Command | What It Verifies |
|-------|---------|-------------------|
| Lint & Format | `pnpm check` | Biome rules pass |
| Type Check | `pnpm type-check` | No TypeScript errors |
| Tests | `pnpm test` | Unit, integration, and PHP tests pass |
| Build | `pnpm build` | Project builds successfully |

All checks must pass before merging.

### 6. Review & Merge

- PRs require review before merging
- Address review feedback with new commits (don't force-push during review)
- Once approved and green, the PR gets merged into `main`

## Code Standards & Tooling

### Biome

[Biome](https://biomejs.dev/) handles both linting and formatting. There is no separate ESLint or Prettier setup.

```bash
pnpm check          # Lint + format check (what CI runs)
pnpm lint           # Linting only
pnpm format         # Auto-fix formatting
pnpm format:check   # Check formatting without fixing
```

Key settings:

- **Line width:** 100 characters
- **Indent:** 2 spaces
- **Line endings:** LF
- **Semicolons:** always
- **Quotes:** single (JS), double (JSX)

Biome runs automatically on staged files via a pre-commit hook, so most issues get caught before you even commit.

### TypeScript

Strict mode is enabled across the monorepo. Run the type checker with:

```bash
pnpm type-check
```

### Conventional Commits

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/). This is enforced by commitlint via a commit-msg hook.

**Format:**

```
type(scope): Subject in sentence case

Optional body with more detail.

Optional footer (e.g., Closes #42)
```

**Types:**

| Type | Use For |
|------|---------|
| `feat` | New features |
| `fix` | Bug fixes |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructuring, no behavior change |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `build` | Build system or dependency changes |
| `ci` | CI/CD configuration |
| `chore` | Maintenance tasks |
| `revert` | Reverting a previous commit |

**Scopes:**

| Scope | Area |
|-------|------|
| `frontend` | SvelteKit app |
| `backend` | Hono API server |
| `shared` | Shared package |
| `database` | Migrations and schema |
| `docs` | Documentation |
| `deps` | Dependency updates |
| `config` | Configuration files |
| `ci` | CI/CD workflows |
| `dx` | Developer experience |
| `all` | Cross-cutting changes |

**Examples:**

```
feat(backend): Add friend search endpoint
fix(frontend): Resolve circle list rendering on mobile
refactor(shared): Extract validation utilities
test(backend): Add integration tests for auth flow
chore(deps): Update dependencies to latest versions
```

### Database Conventions

- Use logical schemas (`auth`, `contacts`, `collectives`, `encounters`, `system`) — never `public`
- Internal IDs: `SERIAL` — never exposed via the API
- External IDs: `UUID` — used in all API responses and URLs
- Use `TEXT` instead of `VARCHAR`
- SQL files live in `apps/backend/src/` and PgTyped generates type-safe `*.queries.ts` files from them

After editing any `.sql` file, regenerate types:

```bash
pnpm pgtyped
```

### Testing

```bash
pnpm test               # Everything (unit + integration + PHP)
pnpm test:unit          # Unit tests only (Vitest)
pnpm test:integration   # Integration tests only (Vitest + testcontainers)
pnpm test:e2e           # End-to-end tests (Playwright)
pnpm test:php           # PHP tests (PHPUnit)
```

### Git Hooks

[Husky](https://typicode.github.io/husky/) runs these hooks automatically:

| Hook | What It Does |
|------|-------------|
| **pre-commit** | Biome check + format on staged files, type-check and build for affected apps |
| **commit-msg** | Validates commit message format via commitlint |
| **pre-push** | Runs the full test suite |

### Project Structure

```
freundebuch2/
├── apps/
│   ├── backend/        # Hono API server (Node.js)
│   ├── frontend/       # SvelteKit application
│   └── sabredav/       # PHP CalDAV/CardDAV server
├── packages/
│   └── shared/         # Shared types & utilities
├── database/
│   ├── migrations/     # SQL migrations
│   └── seeds/          # Seed data
├── docs/               # Project documentation
└── docker/             # Dockerfiles
```

## Questions?

If something is unclear, open an issue and ask. We're happy to help.
