# Epic 18: Better Auth Migration

**Status:** Planned
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** High
**Depends On:** Epic 5 (Multi-User Management)

## Overview

Replace our custom authentication implementation with [Better Auth](https://www.better-auth.com/), a comprehensive, framework-agnostic authentication library for TypeScript. This migration will reduce maintenance burden, improve security, and unlock advanced authentication features with minimal custom code.

## Goals

- Eliminate maintenance overhead of custom auth code
- Gain access to battle-tested, actively maintained authentication
- Enable future authentication enhancements (social login, passkeys, 2FA) with simple configuration
- Improve type safety across auth flows
- Maintain all existing functionality during migration
- Prepare for multi-tenant features in Phase 2 (Epic 16)

## Why Better Auth?

### Current State (Custom Implementation)
- ~600 lines of custom auth code across service, routes, middleware, and utilities
- Manual JWT handling with `jsonwebtoken`
- Custom session management with database queries
- Hand-rolled password reset token flow
- Requires ongoing security maintenance

### Benefits of Better Auth
- **Framework agnostic:** Works seamlessly with Hono (our backend framework)
- **Database adapters:** Native PostgreSQL support with automatic schema generation
- **Type-safe:** Full TypeScript support throughout
- **Plugin ecosystem:** Add features like 2FA, passkeys, magic links by installing plugins
- **Active maintenance:** Backed by Y Combinator, active community (5K+ Discord members)
- **Security built-in:** Password policies, rate limiting, and MFA out of the box
- **Multi-tenant ready:** Organization and team support for Epic 16 features

## Key Features

### Phase 1: Core Migration
- Email/password authentication (replace existing)
- Session management (database-backed)
- Password reset flow
- Profile management
- Cookie-based sessions with HTTP-only security
- JWT access tokens for API authentication

### Phase 2 Enablers (Configuration Only)
- Social OAuth providers (Google, GitHub, etc.)
- Two-factor authentication (TOTP, SMS)
- Passkey/WebAuthn support
- Magic link authentication
- Organization/workspace management
- Role-based access control

## User Stories

1. As a user, I want to continue logging in with email/password without any disruption
2. As a user, I want my existing session to remain valid during the migration
3. As an admin, I want reduced auth-related maintenance work
4. As a developer, I want to add new auth methods (2FA, social login) with minimal code

## Technical Considerations

### Database Schema Changes

Better Auth manages its own schema. We'll need to:

1. **Map existing tables to Better Auth schema:**
   - `users` → Better Auth `user` table
   - `sessions` → Better Auth `session` table
   - `password_reset_tokens` → Better Auth handles internally

2. **Migration strategy:**
   - Create Better Auth tables alongside existing tables
   - Migrate existing users with password hashes (bcrypt compatible)
   - Migrate active sessions or require re-login
   - Remove old auth tables after verification

### Backend Changes (Hono)

```typescript
// lib/auth.ts - Better Auth configuration
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Match current behavior
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days (match current)
    updateAge: 24 * 60 * 60, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});
```

**Files to modify/remove:**
- `src/services/auth.service.ts` - Replace with Better Auth calls
- `src/routes/auth.ts` - Replace with Better Auth handlers
- `src/middleware/auth.ts` - Update to use Better Auth session validation
- `src/utils/auth.ts` - Remove (Better Auth handles internally)
- `src/models/queries/sessions.sql` - Remove after migration
- `src/models/queries/users.sql` - Simplify (remove auth-specific queries)
- `src/models/queries/password-reset-tokens.sql` - Remove

### Frontend Changes (SvelteKit)

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
});
```

**Files to modify:**
- `src/lib/stores/auth.ts` - Replace with Better Auth client
- `src/routes/auth/login/+page.svelte` - Update to use auth client
- `src/routes/auth/register/+page.svelte` - Update to use auth client
- `src/routes/auth/forgot-password/+page.svelte` - Update to use auth client
- `src/routes/auth/reset-password/+page.svelte` - Update to use auth client
- `src/hooks.server.ts` - Update session handling

### API Endpoint Changes

**Current endpoints → Better Auth equivalents:**
| Current | Better Auth |
|---------|-------------|
| `POST /api/auth/register` | `POST /api/auth/sign-up/email` |
| `POST /api/auth/login` | `POST /api/auth/sign-in/email` |
| `POST /api/auth/logout` | `POST /api/auth/sign-out` |
| `POST /api/auth/refresh` | Handled automatically |
| `POST /api/auth/forgot-password` | `POST /api/auth/forget-password` |
| `POST /api/auth/reset-password` | `POST /api/auth/reset-password` |
| `GET /api/auth/me` | `GET /api/auth/session` |

### Migration Steps

1. **Install dependencies:**
   ```bash
   npm install better-auth
   ```

2. **Create Better Auth configuration**

3. **Generate database migration:**
   ```bash
   npx @better-auth/cli generate
   ```

4. **Migrate existing users:**
   - Write migration script to copy users to Better Auth tables
   - bcrypt hashes are compatible (no re-hashing needed)

5. **Update backend routes:**
   - Mount Better Auth handler on `/api/auth/*`
   - Update middleware to use Better Auth session validation

6. **Update frontend:**
   - Replace auth store with Better Auth client
   - Update auth pages to use new client methods

7. **Test thoroughly:**
   - Registration flow
   - Login/logout flow
   - Password reset flow
   - Session persistence
   - Token refresh

8. **Clean up:**
   - Remove old auth code
   - Drop deprecated database tables
   - Update documentation

### Rollback Strategy

- Keep old auth tables for 2 weeks post-migration
- Feature flag to switch between auth implementations
- Database backup before migration

## Success Metrics

- All existing auth functionality works identically
- Zero user-facing disruption during migration
- Reduction in auth-related code by ~70%
- All existing tests pass (with updates)
- No increase in login/registration latency

## Dependencies

- Better Auth library (v1.4+)
- PostgreSQL adapter for Better Auth
- SvelteKit client integration

## Out of Scope (This Epic)

- Social login implementation (future epic)
- Two-factor authentication (future epic)
- Passkey support (future epic)
- Email verification (future epic)
- Organization/workspace features (Epic 16)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Session invalidation during migration | Users logged out | Migrate sessions or accept one-time logout |
| Password hash incompatibility | Users can't login | Verify bcrypt compatibility before migration |
| API contract changes | Frontend breaks | Update frontend alongside backend |
| Better Auth bugs | Auth failures | Thorough testing, staged rollout |

## Related Epics

- **Epic 5: Multi-User Management** - Existing auth implementation to replace
- **Epic 16: Multi-User Workspaces** - Better Auth's organization features align with this
- **Epic 13: Self-Service Pages** - May use Better Auth's invite/magic link features

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)
- [Hono Integration Guide](https://www.better-auth.com/docs/integrations/hono)
- [SvelteKit Integration Guide](https://www.better-auth.com/docs/integrations/svelte-kit)
- [PostgreSQL Adapter](https://www.better-auth.com/docs/adapters/postgresql)
