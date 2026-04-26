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
# Prerequisites: PostgreSQL 18+ (or Docker), PHP 8.4 + Composer 2 (for sabredav),
# plus mise (https://mise.jdx.dev). mise installs node, aube, hk, and pkl
# at the versions pinned in mise.toml.

git clone <repo-url>
cd freundebuch2
mise install        # installs all pinned tools and registers git hooks via hk
aube install        # installs JS dependencies (reads pnpm-lock.yaml)

# Start the database
mise run docker:up

# Run migrations and seed data
aube migrate
aube seed

# Start all dev servers
aube dev
```

If you don't use mise, install Node 24, [aube](https://github.com/endevco/aube), PHP 8.4, and Composer 2 manually, then run `aube install`. Git hooks register automatically only if [hk](https://hk.jdx.dev) is on your `PATH` when you run `aube install`.

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
aube check          # Biome lint + format
aube type-check     # TypeScript
aube test           # All tests
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
| Lint & Format | `aube check` | Biome rules pass |
| Type Check | `aube type-check` | No TypeScript errors |
| Tests | `aube test` | Unit, integration, and PHP tests pass |
| Build | `aube build` | Project builds successfully |

All checks must pass before merging.

### 6. Review & Merge

- PRs require review before merging
- Address review feedback with new commits (don't force-push during review)
- Once approved and green, the PR gets merged into `main`

## Code Standards & Tooling

### Biome

[Biome](https://biomejs.dev/) handles both linting and formatting. There is no separate ESLint or Prettier setup.

```bash
aube check          # Lint + format check (what CI runs)
aube lint           # Linting only
aube format         # Auto-fix formatting
aube format:check   # Check formatting without fixing
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
aube type-check
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
aube pgtyped
```

### Testing

```bash
aube test               # Everything (unit + integration + PHP)
aube test:unit          # Unit tests only (Vitest)
aube test:integration   # Integration tests only (Vitest + testcontainers)
aube test:e2e           # End-to-end tests (Playwright)
aube test:php           # PHP tests (PHPUnit)
```

### Git Hooks

[hk](https://hk.jdx.dev) runs these hooks automatically. The hook definitions live in [`hk.pkl`](./hk.pkl); see [docs/git-workflow.md](./docs/git-workflow.md#git-hooks-hk) for details.

| Hook | What It Does |
|------|-------------|
| **pre-commit** | Biome (auto-fix) on staged files; type-check for affected app workspace; build + root type-check when `packages/shared` changes |
| **commit-msg** | Validates commit message format via commitlint |
| **pre-push** | Runs Danger, Biome check, type-check, tests, PHP tests, and build (in that order) |

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
