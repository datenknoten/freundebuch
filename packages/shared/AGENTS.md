# Shared Package Guidelines

Shared types, schemas, and utilities used by both frontend and backend.

See root [AGENTS.md](../../AGENTS.md) for general project guidelines.

## Purpose

This package contains code that is:
- Used by both frontend and backend
- Framework-agnostic (no Svelte or Hono dependencies)
- Focused on types, validation, and pure utilities

## Contents

### Types
- API request/response types
- Domain entity types (Contact, User, etc.)
- Shared enums and constants

### ArkType Schemas
- Runtime validation schemas
- Used at API boundaries
- Shared between frontend form validation and backend API validation

### Utilities
- Date formatting
- String manipulation
- Other pure functions

## Guidelines

### Type Definitions
- Export all types from `src/index.ts`
- Use descriptive names: `ContactCreateRequest`, `UserResponse`
- Prefer interfaces for object shapes, types for unions

### ArkType Schemas
- Define schemas alongside their corresponding types
- Export both schema and inferred type
- Keep schemas focused and composable

```typescript
import { type } from 'arktype';

export const ContactSchema = type({
  displayName: 'string',
  email: 'string.email | undefined',
});

export type Contact = typeof ContactSchema.infer;
```

### No `any` Types
- Use `unknown` and narrow appropriately
- Define explicit types for all exports
- Leverage TypeScript's type inference where clear

## Build

```bash
pnpm --filter @freundebuch/shared build
```

The package must be built before frontend or backend can use it. The monorepo scripts handle this automatically.
