# Bug: Flaky Integration Test Timeouts Under Parallel Execution

**Project:** freundebuch2
**Type:** Bug
**Related Epic:** None
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** Low

---

## Summary

Two integration tests in `apps/backend/tests/integration/auth-edge-cases.test.ts` intermittently time out (5000ms default) when the full integration test suite runs in parallel, but pass reliably when run in isolation.

---

## Observed Behavior

During the pre-push hook (`pnpm --filter backend test`), the following tests fail with `Error: Test timed out in 5000ms`:

1. **"should handle concurrent sign-in attempts"** (line 460) — signs up a user, then fires 10 concurrent sign-in requests. Each sign-in involves bcrypt password verification, which is CPU-intensive by design.
2. **"should set session cookie on successful sign-in"** (line 524) — signs up a user, then signs in once. Simple test, but likely starved of resources when other suites run concurrently.

When run in isolation (`pnpm vitest run tests/integration/auth-edge-cases.test.ts`), both pass comfortably:
- Concurrent sign-in: ~2100ms
- Session cookie: ~400ms

## Root Cause

The backend Vitest config (`apps/backend/vitest.config.ts`) has no `fileParallelism`, `pool`, or `sequence` configuration. Vitest defaults to running test files in parallel using a thread pool. Each integration test suite spins up its own Testcontainers PostgreSQL instance and Better Auth stack, so parallel execution creates significant resource contention:

- Multiple PostgreSQL containers running simultaneously
- Multiple bcrypt hash operations competing for CPU
- Multiple Better Auth instances with their own connection pools

The concurrent sign-in test amplifies this by making 10 simultaneous requests, each requiring bcrypt comparison. Under load, this pushes the total execution past the 5s timeout.

---

## Possible Fixes

### Option A: Run integration tests sequentially

Set `fileParallelism: false` for integration tests so only one test file runs at a time. This eliminates resource contention at the cost of slower total test execution.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // ...existing config...
    fileParallelism: false,
  },
});
```

Alternatively, use a Vitest workspace or project configuration to only run integration tests sequentially while keeping unit tests parallel.

### Option B: Increase timeouts for resource-intensive tests

Add explicit timeouts to the affected tests:

```typescript
it('should handle concurrent sign-in attempts', async () => {
  // ...
}, 15000);

it('should set session cookie on successful sign-in', async () => {
  // ...
}, 10000);
```

This is a band-aid — it papers over the contention rather than fixing it, and the thresholds are fragile (CI runners may need different values).

### Option C: Reduce concurrency in the test itself

Lower the concurrent sign-in count from 10 to 3–5, reducing the bcrypt workload:

```typescript
const requests = Array.from({ length: 3 }, () =>
  app.fetch(/* ... */),
);
```

### Option D: Share a single Testcontainers instance

Refactor the test helpers to use a shared PostgreSQL container across all integration test suites (with schema isolation per suite). This would dramatically reduce container overhead and is the most thorough fix, but requires significant refactoring of the test setup.

---

## Affected Files

| File | Description |
|------|-------------|
| `apps/backend/tests/integration/auth-edge-cases.test.ts` | Contains the two flaky tests (lines 460, 524) |
| `apps/backend/vitest.config.ts` | No parallelism or sequence configuration |

---

## Acceptance Criteria

- [ ] The full integration test suite (`pnpm --filter backend test`) passes reliably on repeated runs
- [ ] The pre-push hook does not fail due to test timeouts under normal conditions
- [ ] The chosen fix does not mask real test failures (i.e., don't just set timeouts to 60s)

---

## Out of Scope

- Rewriting the integration test infrastructure
- Changing Testcontainers configuration
- CI pipeline changes (this is about local pre-push reliability)

---

## Dependencies

- None — this is a standalone test reliability improvement
