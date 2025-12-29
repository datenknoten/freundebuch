# Architecture

## Project Overview

**Freundebuch** is a self-hostable web application for relationship management designed for individuals and families. Think of it as your digital friendship book that helps you maintain meaningful connections by tracking interactions, setting reminders, and providing insights into your relationships.

**Important:** This is a personal relationship tool, not a business/sales CRM.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | SvelteKit + Tailwind CSS | Responsive, mobile-first UI |
| Backend | Node.js + Hono | Lightweight RESTful API |
| Database | PostgreSQL + PgTyped | Type-safe SQL queries |
| Package Manager | pnpm workspaces | Monorepo management |
| Type System | TypeScript 5.x (strict) + ArkType | Compile-time + runtime validation |
| Testing | Vitest + Playwright | Unit/integration + E2E |
| Code Quality | Biome | Linting + formatting |
| Migrations | node-pg-migrate | Database schema management |

## Monorepo Structure

```
freundebuch2/
├── apps/
│   ├── backend/              # Hono API server
│   │   ├── src/
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── middleware/   # Request middleware
│   │   │   ├── services/     # Business logic
│   │   │   └── utils/        # Utility functions
│   │   └── AGENTS.md         # Backend-specific guidance
│   └── frontend/             # SvelteKit application
│       ├── src/
│       │   ├── routes/       # SvelteKit routes
│       │   └── lib/
│       │       ├── components/
│       │       ├── stores/   # Svelte stores
│       │       └── api/      # API client
│       └── AGENTS.md         # Frontend-specific guidance
├── packages/
│   └── shared/               # Shared types and utilities
│       └── AGENTS.md         # Shared code guidance
├── database/
│   ├── migrations/           # SQL migration files
│   └── seeds/                # Seed data
├── docs/                     # Documentation
└── project-management/
    └── epics/                # Implementation plans
```

## Standards & Protocols

This application implements open standards for interoperability:

| Standard | RFC | Purpose |
|----------|-----|---------|
| vCard 4.0 | RFC 6350 | Contact data format |
| iCalendar | RFC 5545 | Calendar/reminder format |
| CalDAV/CardDAV | WebDAV-based | Sync protocols |
| OAuth 2.0 | RFC 6749 | Authentication |

## Feature Roadmap

### Phase 1: MVP
1. Contact Management - Extended fields with relationship mapping
2. Categorization - Groups and tags
3. Search - Full-text search
4. Multi-User - Authentication

### Phase 2: Core Features
5. Relationship Management - Interaction logging
6. Reminder System - Automated reminders
7. Activity Timeline - Chronological view
8. Dashboard & Insights - Analytics

### Phase 3: Integration
9. CalDAV/CardDAV - Device sync
10. Import/Export - vCard, CSV, JSON
