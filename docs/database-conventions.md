# Database Conventions & System Prompt

This document defines the database design conventions and best practices for Freundebuch.

## Schema Organization

### PostgreSQL Schemas

All database tables MUST be organized into logical PostgreSQL schemas. Never use the default `public` schema.

**Schema Structure:**
- `auth` - Authentication and user management (users, sessions, tokens)
- `contacts` - Contact management (contacts, relationships, groups)
- `collectives` - Collective management (collective types, collectives, memberships)
- `encounters` - Encounter tracking (encounters, notes, reminders)
- `system` - System tables (migrations, settings, audit logs)

**Example:**
```sql
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (...);
```

### Benefits of Schema Organization

1. **Logical Grouping** - Related tables grouped together
2. **Security** - Fine-grained permission control per schema
3. **Clarity** - Clear separation of concerns
4. **Scalability** - Easy to extend with new feature schemas
5. **Backup/Restore** - Can backup/restore specific schemas

## Primary Keys

### Internal IDs (NEVER expose in API)

Use `SERIAL` (or `BIGSERIAL` for large tables) for internal primary keys.

```sql
id SERIAL PRIMARY KEY
-- or for large tables:
id BIGSERIAL PRIMARY KEY
```

**Why SERIAL?**
- Sequential integers are efficient for indexing
- Faster joins and foreign key lookups
- Smaller storage footprint
- Better database performance
- Reveals nothing about system internals when leaked

### External IDs (ALWAYS expose in API)

Every table MUST have an `external_id` column with type `UUID` for API exposure.

```sql
external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()
```

**Security Rules:**
- ✅ ALWAYS use `external_id` in API responses
- ✅ ALWAYS use `external_id` in API requests (query params, path params, request bodies)
- ✅ Create indexes on `external_id` columns
- ❌ NEVER expose internal `id` columns in APIs
- ❌ NEVER accept internal `id` values from clients

**Why UUID for External IDs?**
- Non-sequential (prevents enumeration attacks)
- Globally unique (safe for distributed systems)
- No information leakage about record counts
- Can be generated client-side if needed
- Industry standard for public identifiers

## Data Types

### Text Storage

**ALWAYS use `TEXT` type for string columns. NEVER use `VARCHAR(n)` or `CHAR(n)`.**

```sql
-- ✅ Correct
email TEXT NOT NULL
name TEXT NOT NULL
description TEXT

-- ❌ Incorrect
email VARCHAR(255) NOT NULL
name VARCHAR(100) NOT NULL
```

**Why TEXT?**
- No arbitrary length limits
- Same performance as VARCHAR in PostgreSQL
- More flexible for future changes
- Simpler schema (no need to choose sizes)
- PostgreSQL optimizes TEXT storage automatically

**Length Validation:**
- If length constraints needed, use CHECK constraints
- Or validate in application layer with ArkType schemas

```sql
-- Optional: Add constraint if business rule requires it
email TEXT NOT NULL CHECK (length(email) <= 255)
```

### Timestamps

Always include `created_at` and `updated_at` timestamps.

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
```

**Use TIMESTAMPTZ:**
- Always store times with timezone information
- Prevents timezone-related bugs
- Enables correct time comparisons across zones

### Booleans

Use proper BOOLEAN type, not integers or strings.

```sql
is_active BOOLEAN NOT NULL DEFAULT true
```

### JSON Data

Use `JSONB` (not JSON) for structured data.

```sql
metadata JSONB DEFAULT '{}'::jsonb
```

**Why JSONB?**
- Better query performance
- Supports indexing (GIN indexes)
- More efficient storage
- Supports operators for querying

## Naming Conventions

### Tables

- Use plural nouns: `users`, `contacts`, `encounters`
- Use snake_case: `contact_groups`, `user_sessions`
- Prefix with schema: `auth.users`, `contacts.contacts`

### Columns

- Use snake_case: `external_id`, `created_at`, `first_name`
- Be descriptive: `email_verified_at` not `ev_at`
- Boolean columns: prefix with `is_`, `has_`, `can_`, `should_`
  - `is_active`, `has_avatar`, `can_login`

### Foreign Keys

- Name after referenced table: `user_id`, `contact_id`
- Use explicit constraint names:
  ```sql
  CONSTRAINT fk_sessions_user_id
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  ```

### Indexes

- Prefix with `idx_`: `idx_users_external_id`, `idx_contacts_email`
- Use descriptive names indicating columns
- Always index `external_id` columns
- Always index foreign key columns

```sql
CREATE INDEX idx_users_external_id ON auth.users(external_id);
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_sessions_user_id ON auth.sessions(user_id);
```

## Constraints

### Required Constraints

1. **Primary Key** - Every table MUST have `id SERIAL PRIMARY KEY`
2. **External ID** - Every table MUST have `external_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid()`
3. **Timestamps** - Every table SHOULD have `created_at` and `updated_at`
4. **Foreign Keys** - Always define with explicit ON DELETE behavior

### Foreign Key Actions

Be explicit about cascading behavior:

```sql
-- Delete dependent records
ON DELETE CASCADE

-- Prevent deletion if dependents exist
ON DELETE RESTRICT

-- Set to NULL if parent deleted
ON DELETE SET NULL

-- For most relations, use CASCADE or RESTRICT
```

## Security Considerations

### Row-Level Security (RLS)

Enable RLS on multi-tenant tables:

```sql
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON auth.users
  USING (id = current_setting('app.current_user_id')::integer);
```

### Sensitive Data

- Hash passwords with bcrypt (never store plain text)
- Consider encryption for PII (email, phone, address)
- Use separate columns for encrypted data
- Never log sensitive data in triggers/functions

## Triggers & Functions

### Auto-Update Timestamps

Always create a trigger to update `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Audit Logging

Consider trigger-based audit logs for sensitive tables:

```sql
CREATE TABLE system.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Best Practices

### Migration Structure

1. Create schema first
2. Create tables in dependency order
3. Add indexes after table creation
4. Create triggers last

### Idempotency

Always make migrations idempotent:

```sql
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
```

### Rollback Support

Always implement `down()` migrations:

```typescript
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable({ schema: 'auth', name: 'sessions' }, { cascade: true });
  pgm.dropTable({ schema: 'auth', name: 'users' }, { cascade: true });
  pgm.dropSchema('auth', { cascade: true });
}
```

## Performance Optimization

### Indexes

Create indexes for:
- Foreign keys (automatically indexed in some DBs, but be explicit)
- Columns used in WHERE clauses
- Columns used in JOIN conditions
- Columns used in ORDER BY
- `external_id` columns (for API lookups)

### Query Optimization

- Use `EXPLAIN ANALYZE` to check query plans
- Avoid SELECT * (specify columns)
- Use appropriate JOIN types
- Consider partial indexes for filtered queries
- Use covering indexes when possible

### Connection Pooling

- Use connection pooling (pg.Pool)
- Set appropriate pool size (min: 2, max: 10 for development)
- Close connections in long-running transactions
- Use prepared statements for repeated queries

## Type Safety with PgTyped

### Query Files

- Organize queries by schema: `queries/auth/`, `queries/contacts/`
- Use descriptive names: `getUserByExternalId.sql`, `createContact.sql`
- Always use `external_id` in WHERE clauses for API-facing queries
- Never expose `id` columns in SELECT statements for API responses

```sql
/* @name GetUserByExternalId */
SELECT external_id, email, created_at, updated_at
FROM auth.users
WHERE external_id = :externalId;
```

### Generated Types

- Regenerate types after schema changes: `pnpm pgtyped`
- Commit generated types to version control
- Types are in `.types.ts` files (gitignored, but examples committed)

## Documentation

### Schema Documentation

Document each schema and table:

```sql
COMMENT ON SCHEMA auth IS 'Authentication and user management';
COMMENT ON TABLE auth.users IS 'User accounts with authentication credentials';
COMMENT ON COLUMN auth.users.external_id IS 'Public UUID for API exposure (never expose id)';
COMMENT ON COLUMN auth.users.id IS 'Internal sequential ID (never expose in API)';
```

## Summary Checklist

For every new table, ensure:

- [ ] Table is in appropriate schema (not `public`)
- [ ] Has `id SERIAL PRIMARY KEY` (internal use only)
- [ ] Has `external_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid()` (for API)
- [ ] Has `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- [ ] Has `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- [ ] Uses `TEXT` for all string columns (not VARCHAR)
- [ ] Has indexes on `external_id` and frequently queried columns
- [ ] Has indexes on all foreign keys
- [ ] Has explicit foreign key constraints with ON DELETE behavior
- [ ] Has `updated_at` trigger
- [ ] Has appropriate constraints (NOT NULL, UNIQUE, CHECK)
- [ ] API queries use `external_id` (never `id`)
- [ ] Down migration properly implemented

---

**Last Updated:** 2025-01-07
**PostgreSQL Version:** 18+
**Node.js Version:** 24+
