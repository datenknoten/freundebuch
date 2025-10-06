# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Personal CRM** - a self-hostable web application for relationship management designed for individuals and families. Think of it as an address book that helps you maintain meaningful connections by tracking interactions, setting reminders, and providing insights into your relationships.

**Current Status:** Planning & Design Phase (Pre-alpha)

## Architecture

### Technology Stack

- **Frontend:** SvelteKit with Tailwind CSS (responsive/mobile-first)
- **Backend:** Node.js with Hono (lightweight RESTful API framework)
- **Database:** PostgreSQL with PgTyped for type-safe SQL queries
- **Package Manager:** pnpm with workspaces (monorepo)
- **Type System:** TypeScript 5.x (strict mode) with ArkType for runtime validation
- **Testing:** Vitest (unit/integration) + Playwright (E2E)
- **Code Quality:** Biome (replaces ESLint + Prettier)
- **Database Migrations:** node-pg-migrate

### Monorepo Structure

```
freundebuch2/
├── apps/
│   ├── backend/              # Hono API server
│   │   ├── src/
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── middleware/   # Express-like middleware
│   │   │   ├── models/       # Database models
│   │   │   ├── services/     # Business logic
│   │   │   └── utils/        # Utility functions
│   └── frontend/             # SvelteKit application
│       ├── src/
│       │   ├── routes/       # SvelteKit routes
│       │   ├── lib/
│       │   │   ├── components/
│       │   │   ├── stores/   # Svelte stores
│       │   │   └── api/      # API client
│       └── tailwind.config.js
├── packages/
│   └── shared/              # Shared types and utilities
├── database/
│   ├── migrations/          # SQL migration files
│   └── seeds/              # Seed data
├── docs/
└── project-management/epics/
```

## Development Workflow

### Trunk-Based Development

This project follows **trunk-based development**:

- Commit directly to `main` or use very short-lived feature branches (< 1 day)
- Use **feature flags** to hide incomplete features in production
- Keep commits small and focused - integrate multiple times per day
- All code on `main` must be deployable (even if features are hidden behind flags)
- CI runs on every commit to `main` with auto-deploy to staging

### Common Commands

Since the codebase is not yet implemented, refer to Epic 0 for the planned command structure:

```bash
# Development
pnpm dev                    # Run all workspace dev scripts concurrently
pnpm build                  # Build all workspaces

# Testing
pnpm test                   # Run all tests across workspaces
pnpm test:unit             # Run unit tests (Vitest)
pnpm test:integration      # Run integration tests (Vitest)
pnpm test:e2e              # Run E2E tests (Playwright)

# Code Quality
pnpm check                 # Run Biome check (lint + format)
pnpm lint                  # Run Biome linter
pnpm format                # Run Biome formatter
pnpm type-check            # Run TypeScript compiler

# Database
pnpm migrate               # Run database migrations
pnpm migrate:create        # Create new migration
pnpm pgtyped               # Generate TypeScript types from SQL queries
pnpm pgtyped:watch         # Watch and regenerate types from SQL queries
pnpm seed                  # Seed database with test data

# Docker
pnpm docker:up             # Start Docker services
pnpm docker:down           # Stop Docker services
```

## Design System

### Colors

- **Forest Green** (`#2D5016`) - Primary brand color for actions, headers, key UI
  - Light: `#3A6B1E`, Dark: `#1F3810`
- **Sage Green** (`#8B9D83`) - Secondary actions and supporting elements
- **Warm Amber** (`#D4A574`) - Accents, highlights, active states

### Typography

- **Headings:** Yanone Kaffeesatz (condensed, geometric sans-serif)
- **Body:** Merriweather (serif for readability)
- **Monospace:** Tailwind's default for code

### Tailwind Usage

Custom colors and fonts are configured in `tailwind.config.js`:

```js
colors: {
  forest: { DEFAULT: '#2D5016', light: '#3A6B1E', dark: '#1F3810' },
  sage: { DEFAULT: '#8B9D83' },
  amber: { warm: '#D4A574' }
}
fontFamily: {
  heading: ['"Yanone Kaffeesatz"', 'sans-serif'],
  body: ['Merriweather', 'serif']
}
```

Use as: `bg-forest`, `text-forest-light`, `font-heading`, `font-body`

## Core Features (Planned)

### Phase 1: MVP
1. **Contact Management** - Extended contact fields with relationship mapping
2. **Categorization** - Groups and tags for organization
3. **Search** - Full-text search across contacts
4. **Multi-User** - Authentication and single-user deployment

### Phase 2: Core Features
5. **Relationship Management** - Interaction logging and tracking
6. **Reminder System** - Automated reminders for staying in touch
7. **Activity Timeline** - Chronological view of interactions
8. **Dashboard & Insights** - Analytics and relationship health metrics

### Phase 3: Integration
9. **CalDAV/CardDAV** - Standards-compliant sync with phones/devices
10. **Import/Export** - Data portability (vCard, CSV, JSON)

## Key Technical Considerations

### Database

- PostgreSQL 15+
- **PgTyped** for 100% type-safe SQL queries (.sql files generate TypeScript types)
- Migration system with node-pg-migrate
- All queries must be written in `.sql` files for PgTyped type generation

### Type Safety

- TypeScript strict mode enabled across all workspaces
- **ArkType** for runtime type validation at API boundaries
- Shared types via `packages/shared` workspace
- No `any` types - use `unknown` and narrow types

### Security

- All dependencies pinned to exact versions
- Renovate handles automated dependency updates with manual review required
- No auto-merge - human oversight for all dependency changes
- Input validation with ArkType at all API endpoints
- PgTyped prevents SQL injection

### Code Quality

- **Biome** for linting and formatting (single config, faster than ESLint+Prettier)
- Auto-fix on save
- Git hooks (Husky) run Biome checks before commit
- Pre-push hooks run all tests

### Authentication

- JWT-based authentication
- Session management
- Password hashing with bcrypt

## Standards & Protocols

This application implements open standards:

- **vCard 4.0** (RFC 6350) - Contact data format
- **iCalendar** (RFC 5545) - Calendar/reminder format
- **CalDAV/CardDAV** (WebDAV-based) - Sync protocols
- **OAuth 2.0** (RFC 6749) - Authentication

## Documentation

- **Concept Doc:** `docs/personal-crm-concept.md` - Complete feature specifications
- **Design Language:** `docs/design-language.md` - Visual design system and UI guidelines
- **Epics:** `project-management/epics/` - Detailed implementation plans for each feature
- **Epic 0:** `project-management/epics/epic-00-project-setup.md` - Complete infrastructure setup guide

## Tone & Writing Style

All documentation and user-facing content follows a **professional yet fun** tone:

- Warm and approachable, not stiff or corporate
- Clear and accessible, avoiding jargon where possible
- Enthusiastic without being over-the-top
- Conversational but maintaining professionalism
- Uses "we" and "you" to create connection

Examples:
- ✅ "Think of this as your relationship assistant"
- ✅ "Never forget to reach out again"
- ❌ "Leveraging synergistic relationship optimization"
- ❌ "Utilizes advanced contact management capabilities"

See `docs/design-language.md` and the epic files for excellent examples of this tone in practice.

## Key Principles

1. **Privacy First** - User data is private and under user control
2. **Standards-Compliant** - Use open standards (vCard, iCalendar, WebDAV) - no lock-in
3. **User-Friendly** - Intuitive from the start, no manual required
4. **Flexible Deployment** - Self-hostable or SaaS
5. **Quality Over Speed** - Test coverage >80%, all tests must pass before merging
6. **Security by Default** - All dependencies reviewed, input validated, SQL injection prevented

## Important Notes

- This is a **personal relationship tool**, not a business/sales CRM
- No enterprise features, social media integration, or complex automation (at least not initially)
- Mobile-first responsive design (no native apps planned yet)
- GDPR compliant with data export/deletion capabilities
- Support for 10,000+ contacts per user
