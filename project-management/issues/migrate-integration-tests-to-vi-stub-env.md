# Chore: Migrate Integration Tests from `process.env` to `vi.stubEnv`

**Project:** freundebuch2
**Type:** Chore / Refactor
**Related Epic:** None (test infrastructure improvement)
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** Low

---

## Summary

The integration test helper files in `apps/backend/tests/integration/` set environment variables by assigning directly to `process.env` and clean them up with `delete process.env.X` in `afterAll`. This pattern is fragile: a test crash before `afterAll` runs leaves stale env state behind, and test files share the same process so leaked variables can influence unrelated suites running in the same worker.

Vitest provides `vi.stubEnv()` and `vi.unstubAllEnvs()` specifically for this purpose. `vi.stubEnv` records the original value of an env variable before overwriting it, and `vi.unstubAllEnvs()` restores all stubbed variables to their original state in a single call — even if the test suite throws. Migrating to this API makes the test setup more robust and brings all helper files into consistency with `health.test.ts`, which already uses `vi.stubEnv` correctly.

---

## Background

A code survey of `apps/backend/tests/integration/` shows four files that still use the old `process.env` mutation pattern, plus one additional assignment inside a shared setup function:

**`auth.helpers.ts`** — `setupAuthTestSuite` sets six variables in `beforeAll` and deletes them in `afterAll`. The shared `setupAuthTests` function also sets `process.env.DATABASE_URL` directly (line 39) before calling `resetConfig()`.

**`friends.helpers.ts`** — `setupFriendsTestSuite` duplicates the same six-variable block.

**`search.helpers.ts`** — `setupSearchTestSuite` duplicates the same six-variable block.

**`postgis.helpers.ts`** — `setupPostGISTestSuite` sets three variables in `beforeAll` and deletes them in `afterAll`. The shared `setupPostGISTests` function also sets `process.env.DATABASE_URL` directly (line 53).

**`health.test.ts`** — Already fully migrated to `vi.stubEnv` / `vi.unstubAllEnvs`. This is the reference implementation.

The `DATABASE_URL` assignment inside `setupAuthTests` and `setupPostGISTests` is a special case: these are plain async functions, not Vitest lifecycle callbacks, so `vi.stubEnv` can be called inside them without any issue — `vi.stubEnv` works anywhere in a test file, not only inside `beforeAll`.

---

## Files to Update

| File | Location of `process.env` usage |
|------|----------------------------------|
| `apps/backend/tests/integration/auth.helpers.ts` | `setupAuthTests` (line 39), `setupAuthTestSuite` beforeAll (lines 316–321) and afterAll (lines 333–339) |
| `apps/backend/tests/integration/friends.helpers.ts` | `setupFriendsTestSuite` beforeAll (lines 180–185) and afterAll (lines 215–221) |
| `apps/backend/tests/integration/search.helpers.ts` | `setupSearchTestSuite` beforeAll (lines 303–308) and afterAll (lines 341–347) |
| `apps/backend/tests/integration/postgis.helpers.ts` | `setupPostGISTests` (line 53), `setupPostGISTestSuite` beforeAll (lines 179–181) and afterAll (lines 188–191) |

---

## Required Changes

### Pattern: replace assignments and deletes

Every block of this shape:

```typescript
// beforeAll
process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret-test-better-auth-secret-1';
process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-1';
process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-1';
process.env.JWT_EXPIRY = '604800';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.LOG_LEVEL = 'silent';

// afterAll
delete process.env.BETTER_AUTH_SECRET;
delete process.env.JWT_SECRET;
delete process.env.SESSION_SECRET;
delete process.env.JWT_EXPIRY;
delete process.env.FRONTEND_URL;
delete process.env.DATABASE_URL;
delete process.env.LOG_LEVEL;
resetConfig();
```

becomes:

```typescript
// beforeAll
vi.stubEnv('BETTER_AUTH_SECRET', 'test-better-auth-secret-test-better-auth-secret-1');
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
vi.stubEnv('JWT_EXPIRY', '604800');
vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
vi.stubEnv('LOG_LEVEL', 'silent');

// afterAll
vi.unstubAllEnvs();
resetConfig();
```

### `DATABASE_URL` inside `setupAuthTests` and `setupPostGISTests`

The inline assignment:

```typescript
process.env.DATABASE_URL = container.getConnectionUri();
```

becomes:

```typescript
vi.stubEnv('DATABASE_URL', container.getConnectionUri());
```

`DATABASE_URL` no longer needs a separate `delete` in `afterAll` because `vi.unstubAllEnvs()` restores it alongside all other stubbed variables.

### Import `vi` in helper files

The helper files currently import from `vitest` but do not import `vi`. Each affected file needs `vi` added to its import:

```diff
- import { afterAll, beforeAll, beforeEach } from 'vitest';
+ import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
```

`postgis.helpers.ts` imports `{ afterAll, beforeAll }` and will need the same addition.

---

## Acceptance Criteria

- [ ] All `process.env.X = 'value'` assignments in the four helper files are replaced with `vi.stubEnv('X', 'value')`
- [ ] All `delete process.env.X` statements in the four helper files are removed
- [ ] Each `afterAll` that previously called multiple `delete process.env.X` statements now calls `vi.unstubAllEnvs()` once, followed by `resetConfig()` as before
- [ ] `vi` is imported from `vitest` in every file that calls `vi.stubEnv` or `vi.unstubAllEnvs`
- [ ] No `process.env` mutations remain in `apps/backend/tests/integration/` (verify with `grep -r 'process\.env\.' apps/backend/tests/integration/`)
- [ ] All integration tests pass after the change (`pnpm --filter backend test:integration`)
- [ ] `health.test.ts` is not modified (it is already correct and serves as the reference)

---

## Out of Scope

- Unit tests outside `apps/backend/tests/integration/` — these are a separate concern
- Changing the env variable names or values — this is a mechanical substitution only
- Modifying `resetConfig()` or the config module itself
- Any changes to `health.test.ts`

---

## Dependencies

- No epic dependencies
- No database or frontend changes required
- Vitest's `vi.stubEnv` is already available in the project; no new dependencies needed

---

## Related Issues

- None — this is a standalone test infrastructure improvement
