# Epic 0: Project Setup & Infrastructure

**Status:** Planned
**Phase:** Pre-MVP (Phase 0)
**Priority:** Critical

## Overview

Establish the foundational infrastructure, development environment, and tooling required for the Personal CRM project. This epic must be completed before any feature development can begin.

## Goals

- Set up a complete development environment
- Establish coding standards and best practices
- Configure CI/CD pipeline
- Set up database schema management
- Implement basic project structure
- Configure deployment infrastructure
- Establish testing framework

## Key Features

### Development Environment Setup

#### Repository Structure
```
freundebuch2/
├── backend/              # Hono API server
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Express-like middleware
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utility functions
│   │   └── index.ts      # Entry point
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # SvelteKit application
│   ├── src/
│   │   ├── routes/       # SvelteKit routes
│   │   ├── lib/          # Components and utilities
│   │   │   ├── components/
│   │   │   ├── stores/   # Svelte stores
│   │   │   └── api/      # API client
│   │   └── app.html
│   ├── static/
│   ├── tests/
│   ├── package.json
│   ├── svelte.config.js
│   └── tailwind.config.js
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
├── .env.example
└── README.md
```

#### Package Configuration
- **Backend:**
  - Node.js LTS (20.x or later)
  - TypeScript 5.x
  - Hono framework
  - Database client (node-postgres or pg)
  - Authentication (JWT)
  - Validation (Zod)

- **Frontend:**
  - SvelteKit
  - Tailwind CSS
  - TypeScript
  - Form handling
  - State management

### Database Setup

#### PostgreSQL Configuration
- PostgreSQL 15+ installation/Docker image
- Database creation scripts
- User/role setup
- Connection pooling configuration
- Environment-based configuration (dev/staging/prod)

#### Migration System
- Migration tool selection (e.g., `node-pg-migrate`, `kysely`, or `drizzle-kit`)
- Initial migration structure
- Migration naming convention
- Up/down migration support
- Migration execution in CI/CD

#### Initial Schema
Create foundational tables:
- `users` - User accounts
- `sessions` - Authentication sessions
- Schema versioning table

### Development Tooling

#### Code Quality Tools
- **ESLint** - JavaScript/TypeScript linting
  - Shared config for backend and frontend
  - Airbnb or Standard style guide
  - Auto-fix on save

- **Prettier** - Code formatting
  - Consistent formatting rules
  - Integration with ESLint
  - Pre-commit hooks

- **TypeScript** - Type checking
  - Strict mode enabled
  - Shared types between frontend/backend
  - Path aliases configured

#### Git Hooks (Husky)
- Pre-commit: Lint and format staged files
- Pre-push: Run tests
- Commit message validation (conventional commits)

#### Environment Management
- `.env.example` with all required variables
- Environment validation on startup
- Separate configs for dev/staging/prod
- Secrets management documentation

### Testing Framework

#### Backend Testing
- **Test Framework:** Vitest or Jest
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
- Lint check (ESLint, Prettier)
- Type check (TypeScript)
- Unit tests
- Integration tests
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

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "Start all services for development",
    "build": "Build production bundles",
    "test": "Run all tests",
    "test:unit": "Run unit tests",
    "test:integration": "Run integration tests",
    "test:e2e": "Run E2E tests",
    "lint": "Run ESLint",
    "format": "Run Prettier",
    "type-check": "Run TypeScript compiler",
    "migrate": "Run database migrations",
    "migrate:create": "Create new migration",
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
- Input validation framework
- SQL injection prevention
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

1. As a developer, I want to clone the repo and run `npm install && npm run dev` to get started quickly
2. As a developer, I want code to auto-format on save so I don't worry about style
3. As a developer, I want tests to run automatically on PR so we catch bugs early
4. As a developer, I want clear documentation so I understand the architecture
5. As a developer, I want database migrations to run automatically so my schema stays up to date
6. As a devops engineer, I want Docker configs so I can deploy easily
7. As a team lead, I want CI/CD pipeline so we can deploy confidently

## Technical Considerations

### Technology Versions
- Node.js: 20.x LTS
- TypeScript: 5.x
- PostgreSQL: 15+
- Hono: Latest stable
- SvelteKit: Latest stable
- Tailwind CSS: 3.x

### Development Tools
- **Package Manager:** npm or pnpm
- **Database Client:** pg (node-postgres)
- **Migration Tool:** node-pg-migrate or kysely
- **Validation:** Zod
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

- Developer can set up project from scratch in <30 minutes
- All tests pass in CI
- Linting and formatting rules are enforced
- Documentation is complete and accurate
- Docker containers build successfully
- Database migrations run without errors
- Zero security vulnerabilities in dependencies

## Dependencies

- Git
- Node.js 20+
- PostgreSQL 15+ (or Docker)
- Docker & Docker Compose (optional but recommended)

## Deliverables

### Phase 0 Completion Checklist

- [ ] Repository initialized with proper structure
- [ ] Backend package configured with Hono
- [ ] Frontend package configured with SvelteKit + Tailwind
- [ ] PostgreSQL database running (local or Docker)
- [ ] Migration system set up and tested
- [ ] ESLint + Prettier configured
- [ ] Git hooks (Husky) working
- [ ] TypeScript strict mode enabled
- [ ] Testing framework configured (Vitest)
- [ ] GitHub Actions workflow created
- [ ] Docker Compose for development environment
- [ ] Environment variable template (.env.example)
- [ ] README with setup instructions
- [ ] Health check endpoint implemented
- [ ] Basic authentication utilities created
- [ ] API documentation structure
- [ ] All dev scripts functional

## Implementation Steps

### Step 1: Repository Initialization
1. Initialize Git repository
2. Create directory structure
3. Set up .gitignore
4. Create README.md

### Step 2: Backend Setup
1. Initialize Node.js project in `backend/`
2. Install Hono and dependencies
3. Configure TypeScript
4. Create basic server with health check
5. Set up database connection
6. Configure environment variables

### Step 3: Frontend Setup
1. Initialize SvelteKit project in `frontend/`
2. Install and configure Tailwind CSS
3. Configure TypeScript
4. Create basic layout and home page
5. Set up API client utilities

### Step 4: Database Setup
1. Install PostgreSQL (local or Docker)
2. Create database
3. Set up migration tool
4. Create initial migrations (users, sessions)
5. Test migration up/down

### Step 5: Development Tooling
1. Configure ESLint for both packages
2. Configure Prettier
3. Set up Husky git hooks
4. Create shared TypeScript types
5. Configure path aliases

### Step 6: Testing Framework
1. Install Vitest
2. Create test utilities
3. Write sample tests
4. Configure coverage reporting
5. Install Playwright for E2E

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

- This epic should be completed before any feature development
- Regular dependency updates should be scheduled
- Security vulnerabilities should be addressed immediately
- Documentation should be kept up to date as project evolves

---

**Estimated Effort:** 1-2 weeks
**Team Size:** 1-2 developers
