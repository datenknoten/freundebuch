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

**Never throw a raw `Error`.** Every failure mode has a class that extends the
`@datenknoten/kit` hierarchy (`AppError`, `ValidationError`, `NotFoundError`,
`ConfigurationError`, and the HTTP ones `HttpError`, `UnauthorizedError`,
`ForbiddenError`, `ConflictError`). Application classes live in `src/errors/`,
one class per `<kebab-name>.error.ts` file, with no barrel: import the defining
file.

### Status mapping

`handleError` from `@datenknoten/kit/http` derives the status from the class:

| Base class | Status | Examples |
|------------|--------|----------|
| `ValidationError` | 400 | `PhoneCountryUnknownError`, `PhotoUploadError`, `InvalidSearchParametersError` |
| `UnauthorizedError` | 401 | `AuthenticationError` |
| `ForbiddenError` | 403 | `OnboardingRequiredError`, `SignupDisabledError` |
| `NotFoundError` | 404 | `FriendNotFoundError(id)`, `ResourceNotFoundError(resource, id)` |
| `ConflictError` | 409 | `CircleNameExistsError`, `DuplicateMembershipError` |
| `HttpError` (own `statusCode`) | 429, 502 | `MaxAppPasswordsExceededError`, `ExternalServiceError`, `OverpassApiError` |
| `AppError` | 500 | `FriendCreationError`, `DataIntegrityError`, `DatabaseConnectionError` |

### Usage Pattern

Routes and services just **throw** the typed error — the global `app.onError`
in `src/app.ts` calls `handleError`, which answers with the status and the flat
JSON body and writes one log line (warn below 500, error from 500), and reports
5xx to Sentry. Don't write per-route `try/catch`; a `try/catch` only converts a
foreign failure (JSON parse, filesystem probe) into a typed error.

```typescript
import { FriendNotFoundError } from '../errors/friend-not-found.error.js';

const friend = await friendsService.getFriendById(userId, friendId);
if (!friend) {
  throw new FriendNotFoundError(friendId);
}
// The global onError turns this into
// 404 { error: 'Friend not found: <friendId>', code: 'NOT_FOUND' }.
```

## Authentication

- **Better Auth** (1.5.5) with passkeys; sessions managed by Better Auth and
  stored in `auth.session`. Session cookies are HTTP-only.
- `authMiddleware` validates the session and resolves both the Better Auth
  user id and the legacy `auth.users.external_id` (UUID) used by domain queries.
- DAV (CardDAV/CalDAV) uses app passwords, bcrypt-hashed.
- The legacy JWT/bcrypt user-auth path has been removed.

## API Response Format

```typescript
// Success — bare resource (no envelope)
T

// Error — flat shape emitted by the global onError handler
{ error: string, code?: string, details?: unknown }

// Paginated — friends use { friends, total, page, pageSize, totalPages };
// newer endpoints use { data: T[], pagination: { page, pageSize, totalCount, totalPages } }
```

## Commands

```bash
# From monorepo root
aube --filter @freundebuch/backend dev           # Run dev server
aube --filter @freundebuch/backend build         # Build for production
aube --filter @freundebuch/backend test          # Run tests
aube --filter @freundebuch/backend type-check    # Check types

# Or from apps/backend/
aube dev
aube build
aube test
```

### Migrations

```bash
aube migrate:create <name>    # Create new migration
aube migrate                  # Run pending migrations
aube migrate:down             # Rollback last migration
```

- Always implement `down()` for rollback
- Make migrations idempotent (`IF NOT EXISTS`)
- Run in dependency order

### PgTyped

```bash
aube pgtyped                  # Generate types from SQL (one-time)
aube pgtyped:watch            # Watch mode for development
```

Run `aube pgtyped` after:
- Creating/modifying `.sql` query files
- Running migrations that change schema

## Related Epics

- Epic 0: Project Setup
- Epic 1: Contact Management API
- Epic 4: Authentication
