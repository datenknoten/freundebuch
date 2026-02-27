# Architecture

## Overview

Freundebuch is a self-hostable web application for personal relationship management. It helps individuals and families maintain meaningful connections by tracking friends, encounters, and collectives.

This is a personal relationship tool, not a business/sales CRM.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | SvelteKit + Tailwind CSS | Responsive, mobile-first UI |
| Backend | Node.js + Hono | Lightweight RESTful API |
| CalDAV/CardDAV | PHP + SabreDAV | Device sync via open protocols |
| Database | PostgreSQL + PostGIS + PgTyped | Type-safe spatial queries |
| Shared | TypeScript + ArkType | Cross-app types and runtime validation |
| Package Manager | pnpm workspaces | Monorepo management |
| Code Quality | Biome | Linting + formatting |
| Testing | Vitest + Playwright + PHPUnit | Unit, integration, E2E |
| Migrations | node-pg-migrate | Database schema management |

## Monorepo Structure

```
freundebuch2/
├── apps/
│   ├── backend/              # Hono API server (Node.js)
│   │   ├── src/
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── services/     # Business logic
│   │   │   ├── models/       # PgTyped SQL queries
│   │   │   ├── middleware/   # Request middleware
│   │   │   ├── types/        # App-level types
│   │   │   └── utils/        # Config, DB, logging, caching
│   │   └── tests/
│   ├── frontend/             # SvelteKit application
│   │   ├── src/
│   │   │   ├── routes/       # File-based routing
│   │   │   └── lib/
│   │   │       ├── components/
│   │   │       ├── stores/   # Svelte stores
│   │   │       ├── api/      # API client
│   │   │       ├── actions/  # Form actions
│   │   │       ├── i18n/     # Translations
│   │   │       └── utils/
│   │   └── tests/
│   └── sabredav/             # CalDAV/CardDAV server (PHP)
│       ├── src/
│       │   ├── Auth/         # App password authentication
│       │   ├── CardDAV/      # CardDAV backend
│       │   ├── Principal/    # Principal backend
│       │   └── VCard/        # vCard mapping
│       └── tests/
├── packages/
│   └── shared/               # Shared types, ArkType schemas, utilities
├── database/
│   ├── migrations/           # SQL migrations (TypeScript)
│   └── seeds/                # Seed data
├── docker/                   # Dockerfiles and nginx configs
├── scripts/
│   └── osm-import/           # OpenStreetMap address data import
├── docs/                     # Documentation
└── project-management/
    └── epics/                # Feature planning
```

## Backend Patterns

Routes delegate to services, services handle business logic and database access. Sub-resources (addresses, emails, phones, URLs, dates) follow a consistent base pattern across both friends and collectives.

**External integrations:**
- PostGIS for spatial address queries
- OpenStreetMap Overpass API for geocoding
- ZipcodeBase for zip code validation
- Sentry for error tracking

**Infrastructure:**
- Pino for structured logging
- LRU caching for address lookups
- Rate limiting on auth endpoints
- node-cron for scheduled cleanup tasks
- Sharp for image processing

## Database Schemas

PostgreSQL with PostGIS extension. Each domain gets its own schema — the `public` schema is never used.

| Schema | Purpose | Key Tables |
|--------|---------|------------|
| `auth` | Authentication and sessions | users, sessions |
| `friends` | Friend management | friends, friend_phones, friend_emails, friend_addresses, friend_urls, friend_dates, friend_professional_history, friend_social_profiles, friend_met_info, friend_relationships, friend_changes, circles, friend_circles |
| `encounters` | Encounter tracking | encounters, encounter_friends |
| `collectives` | Collectives (families, companies, clubs) | collective_types, collective_roles, collectives, collective_memberships, collective_addresses, collective_emails, collective_phones, collective_urls, collective_circles |
| `geodata` | OpenStreetMap address data | import_batches, addresses, address_search_index, housenumbers |

**Key conventions:**
- Internal `id` (SERIAL) for foreign keys — never exposed via API
- External `external_id` (UUID) for all API responses and URLs
- `TEXT` instead of `VARCHAR`
- `created_at` / `updated_at` timestamps with auto-update triggers
- Full-text search indices on searchable tables

## Standards & Protocols

| Standard | RFC | Purpose |
|----------|-----|---------|
| vCard 4.0 | RFC 6350 | Contact data format |
| iCalendar | RFC 5545 | Calendar/reminder format |
| CardDAV | RFC 6352 | Contact sync protocol |
| CalDAV | RFC 4791 | Calendar sync protocol |

The SabreDAV app provides CardDAV/CalDAV protocol support, allowing friends to sync with standard clients (iOS Contacts, macOS Contacts, DAVx5, Thunderbird, etc.).

## Deployment

Multi-container Docker setup with multi-arch builds (amd64 + arm64). Images published to `ghcr.io`. Automated via semantic-release on merge to `main`.

**Services:**
- Backend (Node.js)
- Frontend (static build served by nginx)
- SabreDAV (PHP-FPM)
- Nginx (reverse proxy)
- PostgreSQL with PostGIS

## Feature Status

Detailed epics live in [project-management/epics/](../project-management/epics/).

### Done

- **Epic 0** — Project setup and infrastructure
- **Epic 1** — Friend management with full sub-resources
- **Epic 2** — Encounter management
- **Epic 5** — Multi-user authentication and sessions
- **Epic 10** — Full-text search
- **Epic 12** — Collectives (families, companies, clubs, friend groups)
- **Epic 14** — Sub-resource inline editing

### In Progress

- **Epic 6** — CalDAV/CardDAV interface (SabreDAV infrastructure exists)

### Planned

- **Epic 3** — Reminder system
- **Epic 4** — Categorization and organization
- **Epic 7** — Import/export (vCard, CSV, JSON)
- **Epic 8** — Activity timeline
- **Epic 9** — Dashboard and insights
- **Epic 11** — Custom fields
- **Epic 13** — Self-service pages
- **Epic 15** — Friend notes
- **Epic 16** — Multi-user workspaces
- **Epic 17** — Advanced search
- **Epic 18** — Better auth migration
