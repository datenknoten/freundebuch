# Code Review Policy

Review standards, severity definitions, and analysis methodology for automated code reviews.

-----

## Multi-Pass Review

**Pass 1 — Security & Breaking Changes**

- Authentication/authorization flaws
- Injection vulnerabilities (SQL, XSS, command injection)
- Exposed secrets, API keys, credentials
- Breaking API/interface changes
- Data loss or corruption risks

**Pass 2 — Correctness & Logic**

- Bugs and logic errors
- Race conditions, deadlocks
- Null/undefined handling
- Edge cases and boundary conditions
- Error handling coverage

**Pass 3 — Quality & Maintainability**

- Performance issues (N+1 queries, inefficient algorithms)
- Code clarity and naming
- SOLID principle violations
- Test coverage gaps
- Documentation completeness

-----

## Severity Definitions

|Severity  |Icon|Criteria                                                                     |Review Action  |
|----------|----|-----------------------------------------------------------------------------|---------------|
|Critical  |🚨   |Security vulnerabilities, bugs, data loss, breaking changes without migration|Request Changes|
|Important |⚠️   |Performance problems, missing error handling, maintainability concerns       |Comment        |
|Suggestion|💡   |Alternative approaches, minor improvements, nice-to-haves                    |Comment        |

-----

## Confidence Threshold

> **When uncertain whether something is a genuine issue, prefer silence over potentially incorrect feedback.**

Only flag issues you are **≥ 80% confident** about.

-----

## Always Flag (if new and confident)

- Security vulnerabilities (injection, auth bypass, exposed secrets)
- Bugs and logic errors
- Breaking changes without migration path
- Data loss or corruption risks
- Race conditions and concurrency issues
- Missing error handling on critical paths
- N+1 queries and obvious performance problems
- AGENTS.md MUST-PASS/REQUIRED violations

## Never Flag

- Style issues handled by linters/formatters (ESLint, Prettier, etc.)
- Pre-existing issues not introduced by this PR
- Personal preferences not documented in AGENTS.md
- Speculative concerns without concrete evidence
- Minor optimizations with negligible real-world impact
- Issues where confidence < 80%

-----

## Context Adjustments

|PR Type          |Review Approach                      |
|-----------------|-------------------------------------|
|Hotfix/urgent    |Critical issues only                 |
|Refactoring      |Focus on architecture, test coverage |
|Draft PR         |Lighter review, directional feedback |
|Dependency update|Breaking changes, security advisories|
|New contributor  |More explanatory, educational tone   |

-----

## Language-Specific Focus

|Language             |Priority Checks                                           |
|---------------------|----------------------------------------------------------|
|TypeScript/JavaScript|Type safety, async patterns, memory leaks, null coalescing|
|SQL                  |Injection risks, missing indexes, N+1 patterns            |

-----

## Deduplication Algorithm

**For each potential issue, before queuing a comment:**

1. **Create issue key:** `(file_path, line ± 5, issue_category)`
1. **Search existing comments** (fetched during initialization):
- Same file + similar line range + same issue type → **SKIP (duplicate)**
- Same code pattern mentioned in any existing comment → **SKIP (duplicate)**
1. **Only queue if no semantic match found**

**Pattern Grouping:** If the same issue appears in multiple locations (e.g., missing null check in 5 places), create **ONE** comment listing all locations:

```
Found in: src/a.ts:45, src/b.ts:23, src/c.ts:89, src/d.ts:12, src/e.ts:67
```
