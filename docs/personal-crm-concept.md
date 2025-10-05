# Concept Document: Personal CRM for Private Individuals

**Version:** 1.0
**Date:** 04.10.2025
**Status:** Initial Draft

---

## 1. Executive Summary

This document describes a personal Customer Relationship Management System (CRM) for private individuals. The application extends a classic address book with intelligent features for relationship management, contact maintenance, and reminders.

The web application enables individuals and families to manage their social contacts in a structured way, document interactions, and actively maintain important relationships. Through CalDAV/CardDAV interfaces, the solution integrates seamlessly into existing ecosystems.

---

## 2. Goals and Non-Goals

### 2.1 Goals

**Primary Goals:**
- Creation of an extended address book with relationship management features
- Support for private individuals in actively maintaining social contacts
- Multi-user capability for shared use within families
- Standards-compliant integration via CalDAV/CardDAV
- Self-hostable web application

**Secondary Goals:**
- Easy usability without learning curve
- Data protection and data sovereignty
- Migration capability from existing address books
- Flexible deployment options (FOSS/SaaS)

### 2.2 Non-Goals

- Enterprise CRM features (Sales Pipeline, Lead Management, etc.)
- Complex workflow automation
- Integrations with business tools (CRM systems, ERP, etc.)
- Native mobile apps (initially only responsive web app)
- Social media integration (can be evaluated later)

---

## 3. Feature Overview (High-Level)

### 3.1 Core Features
1. **Contact Management** - Extended address book with comprehensive contact information
2. **Relationship Management** - Documentation and tracking of interactions
3. **Reminder System** - Automatic notifications for contact maintenance
4. **Categorization & Organization** - Flexible grouping and tagging
5. **Multi-User Management** - Shared use within families/groups

### 3.2 Integration Features
6. **CalDAV/CardDAV Interface** - Standards-compliant synchronization
7. **Import/Export** - Data portability and migration

### 3.3 Supporting Features
8. **Activity Timeline** - Chronological overview of all interactions
9. **Dashboard & Insights** - Overviews and statistics about contacts
10. **Search Functionality** - Quick finding of contacts and information

---

## 4. Detailed Feature Descriptions

### Feature 1: Contact Management

**Description:**
Central management of all contact information with extended fields beyond standard address books.

**Scope:**
- Standard contact fields (name, address, phone, email, etc.)
- Extended fields:
  - Profile picture/avatar
  - Birthday & important dates (anniversaries, etc.)
  - How/where met (date, location, context)
  - Interests & hobbies
  - Profession & organization
  - Social media profiles (optional)
  - Custom fields
- Multiple addresses, phone numbers, emails per contact
- Relationships between contacts (partner, children, siblings, colleagues, etc.)
- Free-text notes with timestamp

**Differentiation from Standard Address Book:**
Focus on personal context and relationship information, not just contact data.

---

### Feature 2: Relationship Management

**Description:**
Documentation and tracking of relationship history with each person.

**Scope:**
- **Interaction Log:**
  - Manual recording of meetings, calls, messages
  - Date, type, notes for each interaction
  - Attachments (photos, documents)
- **Last Interaction:**
  - Automatic display of last contact
  - Time span since last contact
- **Relationship Quality:**
  - Contact frequency tracking
  - Optional categorization (close friend, acquaintance, etc.)
- **Shared Experiences:**
  - Linking events/activities with multiple people
  - Photo albums for shared experiences

---

### Feature 3: Reminder System

**Description:**
Proactive support for contact maintenance through intelligent reminders.

**Scope:**
- **Automatic Reminders:**
  - "Person X not contacted for Y days/weeks"
  - Configurable thresholds per contact or group
  - Birthday reminders (configurable lead time)
- **Manual Reminders:**
  - "Contact X again on [date]"
  - Recurring reminders (e.g., monthly)
- **Reminder Channels:**
  - In-app notifications
  - Email notifications
  - Optional: Browser push notifications
- **Snooze & Dismiss:**
  - Postpone reminders or mark as done

---

### Feature 4: Categorization & Organization

**Description:**
Flexible organization of contacts according to various criteria.

**Scope:**
- **Groups:**
  - Predefined groups (family, friends, work, club, neighbors)
  - Custom groups
  - Hierarchical groups (e.g., Friends > School Friends)
  - One contact can belong to multiple groups
- **Tags:**
  - Free tag assignment (e.g., #Hiking, #Cooking, #Tech)
  - Tag cloud for quick navigation
  - Tag-based filters
- **Favorites:**
  - Marking especially important contacts
  - Quick access to favorites
- **Archiving:**
  - Archive contacts (not delete)
  - Separate view for active/archived contacts

---

### Feature 5: Multi-User Management

**Description:**
Shared use of the contact database within families or households.

**Scope:**
- **User Accounts:**
  - Registration and authentication
  - Password management
  - Profile management
- **Family/Group Spaces:**
  - Creation of shared workspaces
  - Invitation of members
  - Role-based permissions (admin, member, read-only)
- **Contact Ownership:**
  - Personal contacts (visible only to one user)
  - Shared contacts (visible to all group members)
  - Conflict resolution for simultaneous editing
- **Activity Tracking:**
  - Who created/edited which contact
  - Change history

---

### Feature 6: CalDAV/CardDAV Interface

**Description:**
Standards-compliant interfaces for synchronization with external applications.

**Scope:**
- **CardDAV:**
  - Full vCard support (RFC 6350)
  - Synchronization of contacts with:
    - Smartphone address books (iOS, Android)
    - Desktop applications (Thunderbird, Outlook, etc.)
    - Other CardDAV clients
  - Bidirectional synchronization
  - Conflict handling
- **CalDAV:**
  - iCalendar support (RFC 5545)
  - Synchronization of:
    - Birthdays as calendar events
    - Reminders as tasks/appointments
    - Interaction history as calendar entries (optional)
  - Multiple calendars (e.g., "Birthdays", "Meetings")
- **Authentication:**
  - Basic Auth, OAuth 2.0
  - App-specific passwords

---

### Feature 7: Import/Export

**Description:**
Easy migration from and to other systems.

**Scope:**
- **Import:**
  - vCard (.vcf) - single and multi-import
  - CSV import with field mapping
  - Google Contacts export
  - Apple Contacts export
  - Deduplication assistant after import
- **Export:**
  - Full export as vCard
  - Selective export (individual contacts, groups)
  - CSV export for further processing
  - Backup function (complete data export incl. metadata)
- **Data Cleansing:**
  - Duplicate detection
  - Merge function for duplicate contacts
  - Validation of data formats (email, phone, etc.)

---

### Feature 8: Activity Timeline

**Description:**
Chronological display of all interactions and events.

**Scope:**
- **Per-Contact Timeline:**
  - All interactions in chronological order
  - Birthdays, anniversaries
  - Notes with timestamp
  - Filter by interaction type
- **Global Timeline:**
  - Overview of all activities across all contacts
  - Filter by date, person, type
  - "Today", "This Week", "This Month" views
- **Visualization:**
  - Timeline view
  - Calendar view
  - List view
- **Quick Entry:**
  - Quick-add for new interactions
  - Templates for frequent interaction types

---

### Feature 9: Dashboard & Insights

**Description:**
Overviews and statistics for contact maintenance.

**Scope:**
- **Dashboard Widgets:**
  - Upcoming birthdays (next 30 days)
  - Overdue contacts ("Haven't seen in a long time")
  - Contact statistics (total, new this week/month)
  - Activity overview (interactions this week)
  - Top contacts (by interaction frequency)
- **Insights:**
  - Contact frequency analysis
  - Group distribution (pie chart)
  - Interaction trends (temporal development)
  - Identify "neglected" contacts
- **Personalization:**
  - Widget arrangement customizable
  - Selectable metrics
  - Time period filters

---

### Feature 10: Search Functionality

**Description:**
Powerful search across all contact data.

**Scope:**
- **Full-Text Search:**
  - Search across name, notes, tags, groups
  - Fuzzy search (typo-tolerant)
  - Autocomplete during input
- **Advanced Filters:**
  - Combined filters (group + tag + time period)
  - Saved searches/filters
  - "Last contacted" filter
  - Birthday time period
- **Sorting:**
  - By name (A-Z)
  - By last interaction
  - By creation date
  - By interaction frequency
- **Result Preview:**
  - Contact card with most important info
  - Highlighting of search terms

---

## 5. Technical Framework

### 5.1 Architecture Considerations

**Frontend:**
- Modern web technology (React, Vue, Svelte or similar)
- Responsive design (mobile-first)
- Progressive Web App (PWA) capabilities optional
- Offline capability (Service Worker) as future extension

**Backend:**
- RESTful API or GraphQL
- Authentication & authorization (JWT, session-based)
- CalDAV/CardDAV server component
- Database (PostgreSQL, MySQL or similar)

**Deployment:**
- Docker-based for easy installation
- Configurable for FOSS (self-hosting) or SaaS
- Environment variables for configuration
- Reverse proxy compatible (nginx, Traefik)

### 5.2 Security & Privacy

- End-to-end encryption of sensitive notes (optional)
- HTTPS-only
- GDPR compliance (data export, deletion)
- Audit log for all data changes
- Rate limiting
- CORS configuration
- Input validation & sanitization

### 5.3 Performance Requirements

- Page load time < 2 seconds
- Search results < 500ms
- Support for at least 10,000 contacts per user
- Optimistic UI updates
- Lazy loading of lists
- Caching strategy

### 5.4 Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Last 2 major versions
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 6. Dependencies and Interfaces

### 6.1 External Dependencies

**Protocols & Standards:**
- vCard 4.0 (RFC 6350) - CardDAV
- iCalendar (RFC 5545) - CalDAV
- WebDAV (RFC 4918) - basis for CalDAV/CardDAV
- OAuth 2.0 (RFC 6749) - authentication

**Optional Integrations:**
- Email delivery (SMTP) for notifications
- Gravatar for profile pictures
- Geocoding service for addresses (Google Maps, OpenStreetMap)

### 6.2 Internal Interfaces

**API Endpoints (Examples):**
- `/api/contacts` - CRUD for contacts
- `/api/interactions` - interaction tracking
- `/api/reminders` - reminder management
- `/api/groups` - group management
- `/api/users` - user management
- `/caldav/` - CalDAV endpoint
- `/carddav/` - CardDAV endpoint

**Data Model Relationships:**
- User → Contacts (1:n)
- User → Groups (1:n)
- Contact → Interactions (1:n)
- Contact → Reminders (1:n)
- Contact → Groups (n:m)
- Contact → Tags (n:m)
- Group → Users (n:m) - for multi-user

### 6.3 Data Interfaces

**Import Formats:**
- vCard (.vcf)
- CSV
- JSON (for backup/restore)

**Export Formats:**
- vCard (.vcf)
- CSV
- JSON
- PDF (for printing individual contacts or lists)

---

## 7. Next Steps

### Phase 1: MVP (Minimum Viable Product)
- Feature 1: Contact Management (basic)
- Feature 4: Categorization (groups & tags)
- Feature 10: Search Functionality (basic)
- Feature 5: Multi-User (single-tenant MVP)

### Phase 2: Core Functionality
- Feature 2: Relationship Management
- Feature 3: Reminder System
- Feature 8: Activity Timeline
- Feature 9: Dashboard (basic)

### Phase 3: Integration & Polish
- Feature 6: CalDAV/CardDAV
- Feature 7: Import/Export
- Feature 9: Dashboard (extended)
- Performance optimization

### Open Questions for Clarification
1. Should the multi-tenant architecture be implemented from the start or later?
2. What monetization strategy is intended for the SaaS variant?
3. What backup strategy should be implemented?
4. Should contacts be physically deleted or just marked as deleted?
5. What localizations (languages) are initially planned?

---

## 8. Glossary

- **CalDAV**: Calendaring Extensions to WebDAV - protocol for calendar synchronization
- **CardDAV**: vCard Extensions to WebDAV - protocol for contact synchronization
- **CRM**: Customer Relationship Management
- **FOSS**: Free and Open Source Software
- **MVP**: Minimum Viable Product
- **PWA**: Progressive Web App
- **SaaS**: Software as a Service
- **vCard**: Electronic business card format

---

**End of Document**
