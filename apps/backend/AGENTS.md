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
- Queries organized by schema: `queries/auth/`, `queries/friends/`

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
- Group by resource: `routes/auth.ts`, `routes/friends.ts`
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

## Error Handling

**Always use custom error classes from `utils/errors.ts` instead of raw `Error`.**

### Available Error Classes

| Error Class | Status Code | Use Case |
|-------------|-------------|----------|
| `AuthenticationError` | 401 | Invalid credentials |
| `InvalidSessionError` | 401 | Invalid/expired sessions |
| `InvalidTokenError` | 401 | Invalid/expired tokens |
| `UserNotFoundError` | 404 | User not found |
| `FriendNotFoundError` | 404 | Friend not found |
| `UserAlreadyExistsError` | 409 | Registration conflicts |
| `BirthdayAlreadyExistsError` | 409 | Duplicate birthday |
| `UserCreationError` | 500 | User creation failed |
| `FriendCreationError` | 500 | Friend creation failed |
| `AppPasswordCreationError` | 500 | App password creation failed |
| `PreferencesUpdateError` | 500 | Preferences update failed |
| `DatabaseConnectionError` | 500 | No database connection |
| `ConfigurationError` | 500 | Invalid configuration |
| `OverpassApiError` | 502 | Overpass API errors |
| `ZipcodeBaseApiError` | 502 | ZipcodeBase API errors |

### Usage Pattern

```typescript
// In services - throw custom errors
import { AuthenticationError, UserNotFoundError } from '../utils/errors.js';

if (!user) {
  throw new UserNotFoundError();
}

// In routes - use isAppError for type-safe handling
import { isAppError } from '../utils/errors.js';

try {
  // ... service call
} catch (error) {
  if (isAppError(error)) {
    return c.json({ error: error.message }, error.statusCode);
  }
  // Handle unknown errors
}
```

### Why Custom Errors?

- Type-safe error handling with `instanceof` checks
- Consistent HTTP status codes via `statusCode` property
- Better Sentry/logging integration
- Improved debugging with proper stack traces

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
