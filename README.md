# Personal CRM - Relationship Management for Individuals

A self-hostable web application that helps individuals and families actively maintain their social connections through intelligent contact management, interaction tracking, and relationship reminders.

## What is it?

Personal CRM extends a traditional address book with features designed to help you nurture meaningful relationships:

- **Smart Contact Management** - Store not just contact details, but context: how you met, shared interests, important dates
- **Interaction Tracking** - Log meetings, calls, and messages to maintain relationship history
- **Intelligent Reminders** - Get notified when you haven't contacted someone in a while, upcoming birthdays, and custom follow-ups
- **Relationship Insights** - Visualize your social network and identify connections that need attention
- **Multi-User Support** - Share contact management within families or households
- **Standards-Based Sync** - CardDAV/CalDAV integration for seamless synchronization with phones and calendars

## Project Vision

Transform personal relationship management from reactive to proactive - helping people stay connected with the relationships that matter most.

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

- **Privacy First** - Your relationship data stays under your control
- **Standards-Compliant** - Built on open standards (vCard, iCalendar, WebDAV)
- **User-Friendly** - Intuitive interface with minimal learning curve
- **Flexible Deployment** - Self-host or use managed service

## Contributing

This project is in early planning stages. Contributions and feedback welcome.

## License

TBD
