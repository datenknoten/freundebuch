# Personal CRM - Relationship Management for Individuals

Ever feel like you're losing touch with people who matter? We get it. This self-hostable web application helps you stay connected with the people in your life through smart contact management, interaction tracking, and friendly reminders.

## What is it?

Think of Personal CRM as your relationship assistant. It's an address book that actually helps you maintain meaningful connections:

- **Smart Contact Management** - Remember not just phone numbers, but the stuff that matters: how you met, what you talked about, shared interests, and important dates
- **Interaction Tracking** - Keep a history of your meetings, calls, and messages so you never forget where you left off
- **Intelligent Reminders** - Get a gentle nudge when you haven't talked to someone in a while, plus birthday alerts and custom follow-ups
- **Relationship Insights** - See the big picture of your social network and spot connections that could use some attention
- **Multi-User Support** - Perfect for families or households who want to manage contacts together
- **Standards-Based Sync** - Works seamlessly with your phone and calendar through CardDAV/CalDAV

## Project Vision

We're here to help you go from "I should really call them" to actually staying in touch with the people who matter most.

## Current Status

**Phase:** Planning & Design
**Version:** Pre-alpha

See [docs/personal-crm-concept.md](docs/personal-crm-concept.md) for the complete concept document.

## Planned Roadmap

See [project-management/epics/](project-management/epics/) for detailed epic documents.

### Phase 1: MVP
- [Contact Management](project-management/epics/epic-01-contact-management.md) - Extended contact fields and relationship mapping
- [Categorization & Organization](project-management/epics/epic-04-categorization-organization.md) - Groups and tags for organization
- [Search Functionality](project-management/epics/epic-10-search-functionality.md) - Basic search across contacts
- [Multi-User Management](project-management/epics/epic-05-multi-user-management.md) - Authentication and single-user deployment

### Phase 2: Core Features
- [Relationship Management](project-management/epics/epic-02-relationship-management.md) - Interaction logging and tracking
- [Reminder System](project-management/epics/epic-03-reminder-system.md) - Automated reminders for contact maintenance
- [Activity Timeline](project-management/epics/epic-08-activity-timeline.md) - Chronological view of interactions
- [Dashboard & Insights](project-management/epics/epic-09-dashboard-insights.md) - Analytics and relationship health metrics
- [Multi-User Management](project-management/epics/epic-05-multi-user-management.md) - Full workspace and sharing features

### Phase 3: Integration
- [CalDAV/CardDAV Interface](project-management/epics/epic-06-caldav-carddav-interface.md) - Standards-compliant synchronization
- [Import/Export](project-management/epics/epic-07-import-export.md) - Data portability (vCard, CSV, JSON)
- Performance optimization and polish

## Technology Stack

- **Frontend:** SvelteKit with Tailwind CSS, responsive/mobile-first design
- **Backend:** Node.js with Hono (lightweight RESTful API framework)
- **Database:** PostgreSQL
- **CalDAV/CardDAV:** Standards-compliant server integration
- **Deployment:** Docker-based, self-hostable, with optional SaaS offering

## Core Principles

- **Privacy First** - Your relationship data is yours and yours alone
- **Standards-Compliant** - We play nice with open standards (vCard, iCalendar, WebDAV) so you're never locked in
- **User-Friendly** - Easy to use right from the start, no manual required
- **Flexible Deployment** - Host it yourself or let us handle it - your choice

## Contributing

We're in the early planning stages and would love your input! Contributions and feedback are always welcome.

## License

TBD
