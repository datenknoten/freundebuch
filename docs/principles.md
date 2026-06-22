# Key Principles

## 1. Privacy First

User data is private and under user control.

- Self-hostable deployment option
- No telemetry or tracking without explicit consent
- GDPR compliant with data export/deletion capabilities
- Encryption for sensitive data at rest

## 2. Standards-Compliant

Use open standards - no vendor lock-in.

- vCard 4.0 for contact data
- iCalendar for reminders
- CalDAV/CardDAV for device sync
- WebAuthn (passkeys) for passwordless authentication
- Data export in standard formats (JSON, CSV, vCard)

## 3. User-Friendly

Intuitive from the start, no manual required.

- Mobile-first responsive design
- Clear navigation and information hierarchy
- Helpful error messages
- Progressive disclosure of advanced features

## 4. Flexible Deployment

Works however you want to run it.

- Docker container for self-hosting
- Single-user or multi-user modes
- PostgreSQL database (local or cloud)
- Configurable via environment variables

## 5. Quality Over Speed

Test coverage >80%, all tests must pass before merging.

- Comprehensive unit and integration tests
- E2E tests for critical flows
- Type safety throughout the codebase
- Code review for all changes

## 6. Security by Default

Security is not an afterthought.

- All dependencies pinned to exact versions
- Manual review required for dependency updates
- Input validation at all API boundaries (ArkType)
- SQL injection prevention (PgTyped)
- Secure password hashing (bcrypt)
- Session-based authentication via Better Auth, with passkey (WebAuthn) support
- App-specific passwords for CalDAV/CardDAV clients

## 7. Say What You Mean

Conditionals should test the exact condition intended, not lean on truthiness
coercion. This is slightly more verbose but more readable and avoids accidental
matches.

- Prefer explicit comparisons for non-boolean values:
  - `if (value === undefined)` / `if (value === null)` (or `if (value == null)`
    when both `null` and `undefined` are genuinely meant)
  - `if (str === '')` for empty-string checks
  - `if (arr.length === 0)` for empty-array checks
  - `if (count === 0)` for numeric checks
- Avoid a bare `if (!value)` on a value that can legitimately hold a falsy-but-
  valid value (`0`, `''`, `false`), because `!value` silently matches all of
  them as well as `null`/`undefined`/`NaN`.
- A bare `if (flag)` / `if (!flag)` is fine for genuine booleans — the rule
  targets truthiness coercion on non-boolean values, where it hides intent.

```ts
// Avoid — matches 0, '', false, null, undefined, NaN alike
if (!user.middleName) { ... }

// Prefer — states the actual condition
if (user.middleName === undefined) { ... }
```

## Design Constraints

- Support for 10,000+ contacts per user
- Mobile-first responsive design (no native apps initially)
- No enterprise features, social media integration, or complex automation
- This is a personal tool, not a sales/business CRM
