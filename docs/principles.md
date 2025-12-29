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
- OAuth 2.0 for authentication
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
- JWT-based authentication with proper expiry

## Design Constraints

- Support for 10,000+ contacts per user
- Mobile-first responsive design (no native apps initially)
- No enterprise features, social media integration, or complex automation
- This is a personal tool, not a sales/business CRM
