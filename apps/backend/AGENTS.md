# Backend Guidelines

Hono API server with PostgreSQL. See root [AGENTS.md](../../AGENTS.md) for general project guidelines.

## Database

**Always reference [docs/database-conventions.md](../../docs/database-conventions.md) for database design.**

### Key Rules
- Use PostgreSQL schemas (never `public`)
- Internal `id` (SERIAL) - never expose in API
- External `external_id` (UUID) - always use in API
- Use `TEXT` for strings, never `VARCHAR(n)`
- Always include `created_at` and `updated_at`

### PgTyped Queries
- All queries in `.sql` files for type generation
- Queries organized by schema: `queries/auth/`, `queries/contacts/`

## Hono Patterns

### File Structure
```
src/
├── routes/           # API route handlers
├── middleware/       # Request middleware
├── services/         # Business logic
├── utils/            # Utility functions
└── queries/          # SQL query files
```

### Routes
- Group by resource: `routes/auth.ts`, `routes/contacts.ts`
- Use Hono's router for path grouping
- Apply middleware at route group level

### Middleware
- Auth middleware validates JWT tokens
- Request logging with pino
- Error handling with consistent response format

### Services
- Business logic separate from routes
- Services call database queries
- Handle validation with ArkType schemas

## Authentication

- JWT-based with access + refresh tokens
- Tokens stored in HTTP-only cookies (production)
- Password hashing with bcrypt (cost factor 12)
- Session management via database

## API Response Format

```typescript
// Success
{ data: T }

// Error
{ error: { code: string, message: string } }

// Paginated
{ data: T[], pagination: { page, limit, total, totalPages } }
```

## Commands

```bash
# From monorepo root
pnpm --filter backend dev           # Run dev server
pnpm --filter backend build         # Build for production
pnpm --filter backend test          # Run tests
pnpm --filter backend type-check    # Check types

# Or from apps/backend/
pnpm dev
pnpm build
pnpm test
```

### Migrations

```bash
pnpm migrate:create <name>    # Create new migration
pnpm migrate                  # Run pending migrations
pnpm migrate:down             # Rollback last migration
```

- Always implement `down()` for rollback
- Make migrations idempotent (`IF NOT EXISTS`)
- Run in dependency order

### PgTyped

```bash
pnpm pgtyped                  # Generate types from SQL (one-time)
pnpm pgtyped:watch            # Watch mode for development
```

Run `pnpm pgtyped` after:
- Creating/modifying `.sql` query files
- Running migrations that change schema

## Related Epics

- Epic 0: Project Setup
- Epic 1: Contact Management API
- Epic 4: Authentication
