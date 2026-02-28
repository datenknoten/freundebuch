# Freundebuch

A self-hostable web application for relationship management. Think of it as your digital friendship book — an address book that actually helps you maintain meaningful connections.

## Why Freundebuch?

- **Remember what matters** — not just phone numbers, but birthdays, shared memories, and the little details that strengthen friendships
- **Stay in touch** — track interactions and get a gentle nudge when you haven't reached out in a while
- **No lock-in** — built on open standards (vCard, iCalendar, CardDAV/CalDAV), so your data syncs with your phone and stays yours
- **Self-hostable** — run it on your own server, keep full control over your data
- **Multi-user ready** — works great for families or households sharing an address book

## Quick Start

```bash
# Prerequisites: Node.js 24+, pnpm 8+, PostgreSQL 18+ (or Docker)
pnpm install
pnpm docker:up
pnpm migrate
pnpm dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:3000`.

## Documentation

| Document | Description |
|----------|-------------|
| [Concept](docs/concept.md) | Project vision and goals |
| [Architecture](docs/architecture.md) | Tech stack and monorepo structure |
| [Development](docs/development.md) | Local setup and workflow |
| [Database Conventions](docs/database-conventions.md) | Schema design and naming patterns |
| [Design Language](docs/design-language.md) | Visual design system |
| [Brand](docs/brand.md) | Brand guidelines, colors, typography |
| [Principles](docs/principles.md) | Core design principles |
| [Roadmap](project-management/epics/) | Planned features as epics |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to create issues, the PR workflow, and code standards.

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## License

[AGPL-3.0-only](LICENSE.md)
