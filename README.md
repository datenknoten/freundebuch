# Freundebuch

A self-hostable web application for relationship management designed for individuals and families. Think of it as your relationship assistant that helps you maintain meaningful connections.

**Current Status:** Development Phase (Infrastructure Complete - Epic 0 ✅)

## Quick Start

Get up and running in under 30 minutes:

```bash
# Prerequisites: Node.js 24+, pnpm 8+, PostgreSQL 18+ (or Docker)

# 1. Clone the repository
git clone https://github.com/enko/freundebuch2.git
cd freundebuch2

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 4. Start PostgreSQL (using Docker)
pnpm docker:up

# 5. Run database migrations
pnpm migrate

# 6. Start development servers
pnpm dev
```

That's it! Your app is now running:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health check: http://localhost:3000/health

## What is it?

Think of Freundebuch as your digital friendship book. It's an address book that actually helps you maintain meaningful connections:

- **Smart Contact Management** - Remember not just phone numbers, but the stuff that matters
- **Interaction Tracking** - Keep a history of your meetings and conversations
- **Intelligent Reminders** - Get a gentle nudge when you haven't talked to someone in a while
- **Relationship Insights** - See the big picture of your social network
- **Multi-User Support** - Perfect for families or households
- **Standards-Based Sync** - Works seamlessly with your phone through CardDAV/CalDAV

See [docs/concept.md](docs/concept.md) for the complete concept document, and [docs/brand.md](docs/brand.md) for our brand guidelines.

## Planned Roadmap

See [project-management/epics/](project-management/epics/) for detailed epic documents.

### Phase 1: MVP
- [Contact Management](project-management/epics/epic-01-contact-management.md) - Extended contact fields and relationship mapping
- [Categorization & Organization](project-management/epics/epic-04-categorization-organization.md) - Groups and tags for organization
- [Search Functionality](project-management/epics/epic-10-search-functionality.md) - Basic search across contacts
- [Multi-User Management](project-management/epics/epic-05-multi-user-management.md) - Authentication and single-user deployment

### Phase 2: Core Features
- [Relationship Management](project-management/epics/epic-02-relationship-management.md) - Interaction logging and tracking
- [Reminder System](project-management/epics/epic-03-reminder-system.md) - Automated reminders for contact maintenance
- [Activity Timeline](project-management/epics/epic-08-activity-timeline.md) - Chronological view of interactions
- [Dashboard & Insights](project-management/epics/epic-09-dashboard-insights.md) - Analytics and relationship health metrics
- [Multi-User Management](project-management/epics/epic-05-multi-user-management.md) - Full workspace and sharing features

### Phase 3: Integration
- [CalDAV/CardDAV Interface](project-management/epics/epic-06-caldav-carddav-interface.md) - Standards-compliant synchronization
- [Import/Export](project-management/epics/epic-07-import-export.md) - Data portability (vCard, CSV, JSON)
- Performance optimization and polish

## Architecture

### Technology Stack

- **Frontend:** SvelteKit with Tailwind CSS (responsive/mobile-first)
- **Backend:** Node.js with Hono (lightweight RESTful API framework)
- **Database:** PostgreSQL with PgTyped for type-safe SQL queries
- **Package Manager:** pnpm with workspaces (monorepo)
- **Type System:** TypeScript 5.x (strict mode) with ArkType for runtime validation
- **Testing:** Vitest (unit/integration) + Playwright (E2E)
- **Code Quality:** Biome (linting + formatting)
- **Database Migrations:** node-pg-migrate

### Monorepo Structure

```
freundebuch2/
├── apps/
│   ├── backend/              # Hono API server
│   └── frontend/             # SvelteKit application
├── packages/
│   └── shared/              # Shared types and utilities
├── database/
│   ├── migrations/          # SQL migration files
│   └── seeds/              # Seed data
└── docker/                  # Dockerfiles
```

## Development

### Common Commands

```bash
# Development
pnpm dev                    # Run all workspace dev scripts
pnpm build                  # Build all workspaces

# Testing
pnpm test                   # Run all tests
pnpm test:unit             # Run unit tests
pnpm test:integration      # Run integration tests
pnpm test:e2e              # Run E2E tests (Playwright)

# Code Quality
pnpm check                 # Run Biome check (lint + format)
pnpm lint                  # Run Biome linter
pnpm format                # Run Biome formatter
pnpm type-check            # Run TypeScript compiler

# Database
pnpm migrate               # Run database migrations
pnpm migrate:create        # Create new migration
pnpm pgtyped               # Generate TypeScript types from SQL queries
pnpm pgtyped:watch         # Watch and regenerate types
pnpm seed                  # Seed database with test data

# Docker
pnpm docker:up             # Start Docker services
pnpm docker:down           # Stop Docker services
```

### Trunk-Based Development

This project follows **trunk-based development**:

- Commit directly to `main` or use very short-lived feature branches (< 1 day)
- Use **feature flags** to hide incomplete features in production
- Keep commits small and focused - integrate multiple times per day
- All code on `main` must be deployable (even if features are hidden)
- CI runs on every commit to `main`

### Git Hooks

Husky is configured to run:

- **Pre-commit:** Biome check and format on staged files
- **Commit-msg:** Validates commit messages follow conventional commits format
- **Pre-push:** All tests must pass before pushing to main

### Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

optional body

optional footer
```

**Available types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `build` - Build system or dependency changes
- `ci` - CI/CD configuration changes
- `chore` - Other changes that don't modify src or test files

**Available scopes:**
- `backend` - Backend/API changes
- `frontend` - Frontend/UI changes
- `shared` - Shared package changes
- `database` - Database migrations/schema changes
- `docs` - Documentation
- `deps` - Dependency updates
- `config` - Configuration files
- `ci` - CI/CD configuration
- `dx` - Developer experience

**Examples:**
```bash
feat(backend): Add user authentication endpoint
fix(frontend): Resolve contact list rendering issue
docs(database): Update migration guidelines
chore(deps): Update dependencies to latest versions
```

**Rules:**
- Scope is required (commitlint will warn if missing)
- Subject must be sentence case
- Subject must not end with a period
- Header (type + scope + subject) must be ≤100 characters
- Body lines must be ≤100 characters

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://freundebuch:dev_password@localhost:5432/freundebuch_dev

# Server
PORT=3000
FRONTEND_URL=http://localhost:5173

# Authentication
JWT_SECRET=your-secret-key-change-this-in-production
SESSION_SECRET=your-session-secret-change-this-in-production
```

## Database

### Migrations

```bash
# Create a new migration
pnpm migrate:create add-contacts-table

# Run migrations
pnpm migrate

# Rollback migration
pnpm --filter backend run migrate:down
```

### Type-Safe SQL Queries with PgTyped

1. Create a `.sql` file in `apps/backend/src/models/queries/`
2. Write queries with PgTyped annotations:

```sql
/* @name GetUserById */
SELECT id, email, created_at
FROM users
WHERE id = :id;
```

3. Run `pnpm pgtyped` to generate TypeScript types
4. Import and use with full type safety!

## Testing

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests (require database)
pnpm test:integration

# E2E tests with Playwright
pnpm test:e2e

# Watch mode
pnpm --filter backend run test:watch
```

## Docker

```bash
# Start all services (PostgreSQL, backend, frontend)
pnpm docker:up

# Stop all services
pnpm docker:down

# View logs
docker-compose logs -f

# Just PostgreSQL
docker-compose up -d postgres
```

## CI/CD

GitHub Actions runs on every push to `main`:

- Lint and format check (Biome)
- TypeScript type checking
- Unit and integration tests
- Build verification

## Dependencies

Renovate automatically checks for updates:

- Weekly updates (Mondays before 5am)
- Security vulnerabilities get immediate PRs
- **All updates require manual review** - no auto-merge
- All dependencies pinned to exact versions

## Design System

### Colors

- **Forest Green** (`#2D5016`) - Primary actions, headers
- **Sage Green** (`#8B9D83`) - Secondary actions
- **Warm Amber** (`#D4A574`) - Accents, highlights

### Typography

- **Headings:** Yanone Kaffeesatz (use `font-heading`)
- **Body:** Merriweather (use `font-body`)

### Tailwind Usage

```html
<button class="bg-forest text-white font-heading">Click me</button>
<p class="font-body text-gray-700">Body text here</p>
```

## Security

- All dependencies pinned to exact versions
- Automated security vulnerability scanning
- Input validation with ArkType at API boundaries
- Type-safe SQL queries with PgTyped (prevents SQL injection)
- Password hashing with bcrypt
- JWT-based authentication

## Core Principles

- **Privacy First** - Your relationship data is yours and yours alone
- **Standards-Compliant** - Open standards (vCard, iCalendar, WebDAV) - no lock-in
- **User-Friendly** - Easy to use right from the start
- **Flexible Deployment** - Self-hostable or SaaS

## Contributing

See `CONTRIBUTING.md` for guidelines. We welcome contributions!

## License

[To be determined]
