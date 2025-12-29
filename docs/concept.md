# Concept Document: Freundebuch

**Version:** 1.1
**Date:** 04.10.2025
**Status:** Active

---

## 1. Executive Summary

Let's face it - keeping track of everyone in your life is hard. This document outlines Freundebuch, a digital friendship book designed for real people, not sales teams.

We're building a web application that takes your basic address book and transforms it into a relationship management tool. Think of it as having a personal assistant who remembers everyone you know, when you last talked, and when you should reach out again.

The app works great for individuals or families who want to stay better connected with the people in their lives. Plus, it syncs seamlessly with your phone and other devices through standard CalDAV/CardDAV interfaces.

See [brand.md](./brand.md) for our brand guidelines and terminology.

---

## 2. Goals and Non-Goals

### 2.1 What We're Building

**Primary Goals:**
- An address book that actually helps you maintain relationships, not just store phone numbers
- Tools to help you remember to stay in touch with the people who matter
- Multi-user support so families can manage contacts together
- Seamless sync with your existing devices using CalDAV/CardDAV
- A web app you can host yourself or use our hosted version

**Secondary Goals:**
- Make it intuitive - you shouldn't need a tutorial to get started
- Keep your data private and under your control
- Easy migration from Google Contacts, Apple Contacts, or whatever you're using now
- Flexible deployment whether you're technical or not

### 2.2 What We're Not Building (At Least Not Yet)

- Enterprise sales tools - this isn't for managing leads or pipelines
- Complex automation workflows - we're keeping it simple and focused
- Business tool integrations - this is for your personal life, not work
- Native mobile apps - our responsive web app works great on phones for now
- Social media integration - maybe later, but not part of the initial plan

---

## 3. Feature Overview (High-Level)

### 3.1 Core Features
1. **Contact Management** - Your address book, but with all the context you actually need
2. **Relationship Management** - Track interactions and keep the history of your relationships
3. **Reminder System** - Never forget to reach out again
4. **Categorization & Organization** - Organize contacts your way with circles and tags
5. **Multi-User Management** - Share contacts with family or housemates

### 3.2 Integration Features
6. **CalDAV/CardDAV Interface** - Sync seamlessly with your phone, computer, and other devices
7. **Import/Export** - Move your data in and out easily - no lock-in

### 3.3 Supporting Features
8. **Activity Timeline** - See your relationship history at a glance
9. **Dashboard & Insights** - Get the big picture of your social network
10. **Search Functionality** - Find anyone or anything, fast

---

## 4. Detailed Feature Descriptions

### Feature 1: Contact Management

**What it does:**
This is your contact database on steroids. We're storing way more than just phone numbers and email addresses.

**What you get:**
- All the basics (name, address, phone, email)
- The good stuff:
  - Profile pictures so you remember faces
  - Birthdays and important dates (no more forgotten anniversaries!)
  - How and where you met (was it that conference in 2019?)
  - Their interests and hobbies (great conversation starters)
  - What they do for work
  - Social media profiles if you want them
  - Custom fields for whatever else matters to you
- Multiple addresses, phone numbers, and emails per person
- Map relationships between contacts (partners, kids, siblings, coworkers)
- Add notes whenever you think of something important

**Why it's different:**
We care about the context and story of your relationships, not just the data points.

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
  - Configurable thresholds per contact or circle
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
- **Circles:**
  - Predefined circles (family, friends, work, club, neighbors)
  - Custom circles
  - Hierarchical circles (e.g., Friends > School Friends)
  - One contact can belong to multiple circles
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
  - Selective export (individual contacts, circles)
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
  - Circle distribution (pie chart)
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
  - Search across name, notes, tags, circles
  - Fuzzy search (typo-tolerant)
  - Autocomplete during input
- **Advanced Filters:**
  - Combined filters (circle + tag + time period)
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
- `/api/circles` - circle management
- `/api/users` - user management
- `/caldav/` - CalDAV endpoint
- `/carddav/` - CardDAV endpoint

**Data Model Relationships:**
- User → Contacts (1:n)
- User → Circles (1:n)
- Contact → Interactions (1:n)
- Contact → Reminders (1:n)
- Contact → Circles (n:m)
- Contact → Tags (n:m)
- Circle → Users (n:m) - for multi-user

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

## 7. What's Next?

### Phase 1: MVP (The Essentials)
Let's start with the basics that make this useful:
- Feature 1: Contact Management (the core database)
- Feature 4: Categorization (organize with circles & tags)
- Feature 10: Search (find what you need)
- Feature 5: Multi-User (authentication and basic setup)

### Phase 2: The Magic Happens
Now we add the features that make staying in touch easier:
- Feature 2: Relationship Management (track your interactions)
- Feature 3: Reminder System (never forget to reach out)
- Feature 8: Activity Timeline (see the full history)
- Feature 9: Dashboard (get the big picture)

### Phase 3: Play Nice with Others
Finally, let's make it work with everything else:
- Feature 6: CalDAV/CardDAV (sync with your devices)
- Feature 7: Import/Export (move data in and out)
- Feature 9: Dashboard (enhanced insights)
- Performance tuning (make it fast!)

### Phase 4: Full Circle
Bring back the original Freundebuch experience:
- Self-Service Friend Pages (let friends fill out their own pages)
- See [Epic 13](../project-management/epics/epic-13-self-service-pages.md) for details

### Questions We're Still Figuring Out
1. Multi-tenant from day one, or add it later?
2. How should the SaaS pricing work?
3. What's the best backup strategy?
4. Hard delete contacts or soft delete (archive)?
5. Which languages should we support initially?

---

## 8. Glossary

- **CalDAV**: Calendaring Extensions to WebDAV - protocol for calendar synchronization
- **CardDAV**: vCard Extensions to WebDAV - protocol for contact synchronization
- **Circle**: A way to organize friends in Freundebuch (replaces traditional "groups")
- **FOSS**: Free and Open Source Software
- **Freundebuch**: German for "Friendship Book" - a childhood tradition digitized for adults
- **MVP**: Minimum Viable Product
- **Page**: A friend's profile in your Freundebuch
- **PWA**: Progressive Web App
- **SaaS**: Software as a Service
- **vCard**: Electronic business card format

---

**End of Document**
