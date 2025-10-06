# Epic 0: Project Setup & Infrastructure

**Status:** Planned
**Phase:** Pre-MVP (Phase 0)
**Priority:** Critical

## Overview

Before we can build anything cool, we need a solid foundation! This epic is all about setting up our development environment, tooling, and infrastructure. Think of it as building the workshop before we start crafting the furniture.

## Goals

- Create a development environment that's a joy to work with
- Set up coding standards so our code stays clean and consistent
- Build a CI/CD pipeline that gives us confidence to ship
- Get database migrations working smoothly
- Structure the project for long-term success
- Make deployment as simple as possible
- Set up testing so we catch bugs before users do

## Key Features

### Development Environment Setup

#### Repository Structure (pnpm Workspaces Monorepo)
```
freundebuch2/
├── apps/
│   ├── backend/              # Hono API server
│   │   ├── src/
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── middleware/   # Express-like middleware
│   │   │   ├── models/       # Database models
│   │   │   ├── services/     # Business logic
│   │   │   ├── utils/        # Utility functions
│   │   │   └── index.ts      # Entry point
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/             # SvelteKit application
│       ├── src/
│       │   ├── routes/       # SvelteKit routes
│       │   ├── lib/          # Components and utilities
│       │   │   ├── components/
│       │   │   ├── stores/   # Svelte stores
│       │   │   └── api/      # API client
│       │   └── app.html
│       ├── static/
│       ├── tests/
│       ├── package.json
│       ├── svelte.config.js
│       └── tailwind.config.js
├── packages/
│   └── shared/              # Shared types and utilities
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── database/
│   ├── migrations/       # SQL migration files
│   └── seeds/           # Seed data for development
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── docs/
├── project-management/
├── .github/
│   └── workflows/       # GitHub Actions
├── package.json         # Root package.json
├── pnpm-workspace.yaml  # pnpm workspace configuration
├── pnpm-lock.yaml       # pnpm lockfile
├── biome.json          # Biome configuration
├── .env.example
└── README.md
```

#### Package Configuration

- **Monorepo:**
  - pnpm Workspaces for package management
  - Efficient disk space usage with content-addressable storage
  - Workspace packages: apps/backend, apps/frontend, packages/shared

- **Backend:**
  - Node.js LTS (20.x or later)
  - TypeScript 5.x
  - Hono framework
  - Database access (PgTyped)
  - Type validation (ArkType)
  - Authentication (JWT)

- **Frontend:**
  - SvelteKit
  - Tailwind CSS
  - TypeScript
  - Form handling
  - State management

- **Shared:**
  - TypeScript types shared across frontend/backend
  - ArkType schemas for runtime validation
  - Utility functions

### Database Setup

#### PostgreSQL Configuration
- PostgreSQL 15+ installation/Docker image
- Database creation scripts
- User/role setup
- Connection pooling configuration
- Environment-based configuration (dev/staging/prod)
- PgTyped for type-safe SQL queries

#### Migration System
- Migration tool: node-pg-migrate
- Initial migration structure
- Migration naming convention (timestamp-based)
- Up/down migration support
- Migration execution in CI/CD
- PgTyped query file organization (.sql files)

#### Initial Schema
Create foundational tables:
- `users` - User accounts
- `sessions` - Authentication sessions
- Schema versioning table

### Development Tooling

#### Code Quality Tools
- **Biome** - Fast all-in-one toolchain for linting and formatting
  - Single configuration file (biome.json)
  - Replaces ESLint + Prettier with better performance
  - Auto-fix on save
  - Import sorting
  - Consistent formatting rules
  - Shared config across all workspaces

- **TypeScript** - Type checking
  - Strict mode enabled
  - Shared types via packages/shared workspace
  - Path aliases configured
  - Project references for monorepo

#### Git Hooks (Husky)
- Pre-commit: Biome check and format staged files
- Pre-push: Run tests
- Commit message validation (conventional commits)

#### Environment Management
- `.env.example` with all required variables
- Environment validation on startup
- Separate configs for dev/staging/prod
- Secrets management documentation

### Testing Framework

#### Backend Testing
- **Test Framework:** Vitest
- **Integration Tests:** Supertest for API endpoints
- **Database Tests:** Test database with fixtures
- Test coverage reporting (>80% target)
- Mock strategies for external services

#### Frontend Testing
- **Unit Tests:** Vitest
- **Component Tests:** Testing Library (Svelte)
- **E2E Tests:** Playwright
- Visual regression testing (optional)

#### Test Infrastructure
- Separate test database
- Seed data for tests
- Test utilities and helpers
- CI test execution

### CI/CD Pipeline

#### GitHub Actions Workflows

**On Pull Request:**
- Lint and format check (Biome)
- Type check (TypeScript)
- Unit tests (Vitest)
- Integration tests (Vitest)
- Build verification
- Code coverage report

**On Merge to Main:**
- All PR checks
- Build Docker images
- Tag with version/commit hash
- Push to container registry (optional)
- Deploy to staging (optional)

**On Release Tag:**
- Production build
- Create release artifacts
- Deploy to production (optional)
- Generate changelog

### Docker Configuration

#### Development Docker Compose
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: personal_crm_dev
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgres://crm_user:dev_password@postgres:5432/personal_crm_dev

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

#### Production Docker Images
- Multi-stage builds for optimization
- Security scanning (Trivy, Snyk)
- Minimal base images (Alpine)
- Non-root user execution
- Health check endpoints

### API Documentation

#### OpenAPI/Swagger Setup
- OpenAPI 3.0 specification
- Auto-generate from route definitions (if possible)
- Swagger UI for interactive docs
- API versioning strategy

#### Documentation Tools
- JSDoc for code documentation
- API endpoint documentation
- Database schema documentation
- Architecture decision records (ADR)

### Development Scripts

#### Package.json Scripts (Root)
```json
{
  "scripts": {
    "dev": "Run all workspace dev scripts concurrently",
    "build": "Build all workspaces",
    "test": "Run all tests across workspaces",
    "test:unit": "Run unit tests (Vitest)",
    "test:integration": "Run integration tests (Vitest)",
    "test:e2e": "Run E2E tests (Playwright)",
    "lint": "Run Biome linter across all workspaces",
    "format": "Run Biome formatter across all workspaces",
    "format:check": "Check formatting without writing",
    "check": "Run Biome check (lint + format)",
    "type-check": "Run TypeScript compiler across all workspaces",
    "migrate": "Run database migrations",
    "migrate:create": "Create new migration",
    "pgtyped": "Generate TypeScript types from SQL queries",
    "pgtyped:watch": "Watch and regenerate types from SQL queries",
    "seed": "Seed database with test data",
    "docker:up": "Start Docker services",
    "docker:down": "Stop Docker services"
  }
}
```

### Logging & Monitoring

#### Application Logging
- Structured logging (JSON format)
- Log levels (debug, info, warn, error)
- Logger library (pino, winston)
- Request/response logging
- Error tracking

#### Development Monitoring
- Health check endpoint (`/health`)
- Database connection monitoring
- Performance monitoring (optional for Phase 0)

### Security Configuration

#### Basic Security
- CORS configuration
- Helmet.js for security headers
- Rate limiting setup
- Input validation (ArkType)
- SQL injection prevention (PgTyped type-safe queries)
- XSS prevention

#### Authentication Setup (Basic)
- JWT token generation/validation
- Password hashing (bcrypt)
- Session management
- Token refresh mechanism

### Documentation

#### Developer Documentation
- README with setup instructions
- CONTRIBUTING.md with guidelines
- Architecture overview
- Database schema diagram
- API documentation
- Deployment guide

#### Code Comments
- Function/class documentation
- Complex logic explanation
- TODO/FIXME conventions

## User Stories

1. As a developer, I want to clone the repo and run `pnpm install && pnpm dev` to be up and running in minutes
2. As a developer, I want my code to auto-format on save so I can focus on logic, not style
3. As a developer, I want tests to run on every PR so we catch issues before they reach production
4. As a developer, I want clear documentation so I can understand the architecture without hunting through code
5. As a developer, I want migrations to run automatically so my local database stays in sync
6. As a devops engineer, I want Docker configs that just work so deployment is straightforward
7. As a team lead, I want a solid CI/CD pipeline so we can ship with confidence

## Technical Considerations

### Technology Versions
- Node.js: 20.x LTS
- TypeScript: 5.x
- PostgreSQL: 15+
- Hono: Latest stable
- SvelteKit: Latest stable
- Tailwind CSS: 3.x

### Development Tools
- **Package Manager:** pnpm (with workspaces)
- **Monorepo:** pnpm Workspaces
- **Linting & Formatting:** Biome
- **Database Access:** PgTyped (type-safe SQL)
- **Database Migrations:** node-pg-migrate
- **Type Validation:** ArkType
- **Testing:** Vitest + Playwright
- **Logging:** pino
- **Process Manager:** PM2 (optional for production)

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/personal_crm
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
SESSION_SECRET=your-session-secret

# Email (for later phases)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

# Optional
LOG_LEVEL=debug
ENABLE_API_DOCS=true
```

## Success Metrics

- A new developer can get up and running in under 30 minutes
- All tests pass in CI every time
- Code formatting happens automatically - no manual fixes needed
- Documentation is clear, complete, and actually helpful
- Docker containers build without a hitch
- Database migrations work smoothly every time
- Zero security vulnerabilities in our dependencies

## Dependencies

- Git
- Node.js 20+
- pnpm 8+ (package manager)
- PostgreSQL 15+ (or Docker)
- Docker & Docker Compose (optional but recommended)

## Deliverables

### Phase 0 Completion Checklist

- [ ] Repository initialized with monorepo structure
- [ ] pnpm Workspaces configured (pnpm-workspace.yaml)
- [ ] Backend workspace configured with Hono (apps/backend)
- [ ] Frontend workspace configured with SvelteKit + Tailwind (apps/frontend)
- [ ] Shared types workspace set up (packages/shared)
- [ ] ArkType configured for type validation
- [ ] PostgreSQL database running (local or Docker)
- [ ] PgTyped configured and generating types from SQL
- [ ] Migration system set up and tested
- [ ] Biome configured for linting and formatting
- [ ] Git hooks (Husky) working with Biome
- [ ] TypeScript strict mode enabled across all workspaces
- [ ] Testing framework configured (Vitest)
- [ ] GitHub Actions workflow created
- [ ] Docker Compose for development environment
- [ ] Environment variable template (.env.example)
- [ ] README with setup instructions
- [ ] Health check endpoint implemented
- [ ] Basic authentication utilities created
- [ ] API documentation structure
- [ ] All workspace scripts functional

## Implementation Steps

### Step 1: Repository Initialization
1. Initialize Git repository
2. Install pnpm globally if needed
3. Create monorepo directory structure (apps/, packages/)
4. Set up root package.json
5. Create pnpm-workspace.yaml with workspace configuration
6. Set up .gitignore (include node_modules, .pnpm-store)
7. Create README.md

### Step 2: Backend Setup
1. Initialize Node.js project in `apps/backend/`
2. Install Hono and dependencies
3. Configure TypeScript with project references
4. Create basic server with health check
5. Set up database connection
6. Configure environment variables

### Step 3: Frontend Setup
1. Initialize SvelteKit project in `apps/frontend/`
2. Install and configure Tailwind CSS
3. Configure TypeScript with project references
4. Create basic layout and home page
5. Set up API client utilities

### Step 4: Database Setup
1. Install PostgreSQL (local or Docker)
2. Create database
3. Install and configure node-pg-migrate
4. Configure PgTyped for type-safe queries
5. Create initial migrations with node-pg-migrate (users, sessions)
6. Run migrations
7. Write initial SQL query files for PgTyped
8. Generate TypeScript types from SQL
9. Test migration up/down

### Step 5: Development Tooling
1. Install and configure Biome at root level
2. Create biome.json with lint and format rules
3. Set up Husky git hooks with Biome
4. Create shared TypeScript types workspace (packages/shared)
5. Configure ArkType for runtime type validation
6. Set up shared ArkType schemas
7. Configure path aliases and TypeScript project references

### Step 6: Testing Framework
1. Install Vitest across workspaces
2. Configure Vitest in each workspace
3. Create test utilities
4. Write sample tests
5. Configure coverage reporting
6. Install Playwright for E2E tests

### Step 7: CI/CD
1. Create GitHub Actions workflow
2. Configure test database for CI
3. Set up lint/test/build jobs
4. Configure secrets management
5. Test workflow on sample PR

### Step 8: Docker Configuration
1. Create Dockerfiles
2. Create docker-compose.yml
3. Test local Docker setup
4. Document Docker usage
5. Configure health checks

### Step 9: Documentation
1. Write comprehensive README
2. Document API structure
3. Create architecture diagram
4. Write CONTRIBUTING.md
5. Document environment variables

### Step 10: Validation
1. Fresh clone test
2. Verify all scripts work
3. Verify CI pipeline works
4. Security audit
5. Team review

## Related Epics

All subsequent epics depend on this foundational setup.

## Notes

- Everything else depends on this being done right - it's our foundation!
- Keep dependencies updated regularly (set a schedule and stick to it)
- Security vulnerabilities get fixed immediately, no exceptions
- Documentation evolves with the project - keep it current

---

**Estimated Effort:** 1-2 weeks
**Team Size:** 1-2 developers who like building solid foundations
