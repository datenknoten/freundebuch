# Epic 1: Contact Management

**Status:** Planned
**Phase:** MVP (Phase 1)
**Priority:** High

## Overview

Central management of all contact information with extended fields beyond standard address books. This is the foundation of the Personal CRM system.

## Goals

- Provide a comprehensive contact database that stores standard and extended information
- Enable rich context about relationships beyond basic contact details
- Support multiple communication channels per contact
- Allow flexible custom fields for personalization

## Key Features

### Standard Contact Fields
- Name (first, last, middle, prefix, suffix)
- Address (multiple addresses per contact)
- Phone numbers (multiple, with types: mobile, home, work)
- Email addresses (multiple)
- Website/URLs

### Extended Fields
- Profile picture/avatar
- Birthday & important dates (anniversaries, etc.)
- How/where met (date, location, context)
- Interests & hobbies
- Profession & organization
- Social media profiles (optional)
- Custom fields (user-defined)

### Relationship Mapping
- Define relationships between contacts (partner, children, siblings, colleagues, etc.)
- Visualize connection graphs

### Notes System
- Free-text notes with timestamps
- Rich text support
- Searchable note content

## User Stories

1. As a user, I want to store multiple phone numbers and email addresses for each contact so I can reach them through different channels
2. As a user, I want to record how and where I met someone so I can remember the context of our relationship
3. As a user, I want to add custom fields so I can track information specific to my needs
4. As a user, I want to link related contacts (family members, colleagues) so I can see their relationships
5. As a user, I want to add timestamped notes to contacts so I can remember important details about them

## Technical Considerations

### Database Schema
- `contacts` table with standard fields
- `contact_fields` table for custom fields
- `contact_relationships` table for mapping relationships
- `contact_notes` table for timestamped notes
- `contact_addresses`, `contact_phones`, `contact_emails` tables for multiple entries

### API Endpoints
- `GET /api/contacts` - List contacts with pagination and filtering
- `GET /api/contacts/:id` - Get single contact details
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete/archive contact
- `GET /api/contacts/:id/relationships` - Get contact relationships
- `POST /api/contacts/:id/notes` - Add note to contact

### Frontend Components
- Contact list view (table/card layout)
- Contact detail view
- Contact form (create/edit)
- Custom field builder
- Relationship visualizer
- Notes timeline

## Success Metrics

- Ability to create and manage contacts with all standard fields
- Support for at least 10,000 contacts per user with good performance
- Custom fields working properly
- Relationship mapping functional

## Dependencies

- User authentication system
- PostgreSQL database setup
- File storage for profile pictures

## Out of Scope

- Bulk import/export (comes in Phase 3)
- CalDAV/CardDAV sync (comes in Phase 3)
- Advanced search (basic search in MVP, advanced in Phase 1)

## Related Epics

- Epic 4: Categorization & Organization
- Epic 5: Multi-User Management
- Epic 10: Search Functionality
