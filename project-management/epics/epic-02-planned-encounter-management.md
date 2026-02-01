# Epic 2: Encounter Management (Begegnungen)

**Status:** Planned
**Phase:** Core Functionality (Phase 2)
**Priority:** High
**GitHub Issue:** [#4](https://github.com/enko/freundebuch2/issues/4)

## Overview

This feature lets you capture and remember the meaningful moments you share with friends. Every coffee date, dinner party, hike, or spontaneous meetup becomes part of your friendship story. Encounters help you build a rich history of shared experiences with the people who matter most.

## Goals

- Make it simple to log encounters with friends as they happen
- Create a searchable archive of shared memories
- Help you see patterns in your friendships (who you meet, where, how often)
- Build a comprehensive timeline of your social life

## Key Features

### Encounter Log
- Each encounter includes:
  - **Title** (required): A memorable name for the encounter (e.g., "Coffee at Café Luna", "Sarah's Birthday Dinner", "Hiking in the Alps")
  - **Date** (required): When the encounter happened
  - **Friends** (required): One or more friends who were part of this encounter
  - **Location** (optional): Where it took place (can link to existing address or free-text)
  - **Description** (optional): Notes, memories, or details about what happened

### Last Encounter Tracking
- Automatic display of the most recent encounter per friend
- Time span since last encounter (e.g., "23 days ago")
- Visual indicators for friends you haven't seen in a while

### Encounter History
- View all encounters with a specific friend
- View all encounters at a specific location
- Filter encounters by date range
- Search encounters by title or description

### Group Encounters
- Link multiple friends to a single encounter
- See which friends you often meet together
- Track group dynamics over time

## User Stories

1. As a user, I want to log an encounter with a friend so I can remember when we last met
2. As a user, I want to see all my encounters with a specific friend to review our shared history
3. As a user, I want to add a location to an encounter so I can remember where we met
4. As a user, I want to add multiple friends to an encounter when we meet as a group
5. As a user, I want to search my encounters by title or description to find specific memories
6. As a user, I want to see how long it's been since I last met each friend

## Technical Considerations

### Database Schema
- `encounters` table:
  - `id` (serial, primary key)
  - `external_id` (uuid, unique)
  - `user_id` (integer, references auth.users)
  - `title` (varchar(255), not null)
  - `encounter_date` (date, not null)
  - `location_text` (varchar(500), optional free-text location)
  - `location_address_id` (integer, optional reference to geodata.addresses)
  - `description` (text, optional)
  - `created_at`, `updated_at` timestamps
- `encounter_friends` junction table:
  - `encounter_id` (references encounters)
  - `friend_id` (references friends.friends)
  - Primary key on (encounter_id, friend_id)

### API Endpoints
- `GET /api/encounters` - List all encounters (with pagination and filters)
- `GET /api/encounters/:id` - Get encounter details
- `POST /api/encounters` - Create new encounter
- `PUT /api/encounters/:id` - Update encounter
- `DELETE /api/encounters/:id` - Delete encounter
- `GET /api/friends/:id/encounters` - Get all encounters with a specific friend
- `GET /api/friends/:id/last-encounter` - Get most recent encounter with a friend

### Frontend Components
- Encounter list view (chronological)
- Encounter detail view
- Quick-add encounter form
- Friend selector (multi-select)
- Location picker (with autocomplete from existing addresses)
- Encounter card component
- "Last seen" indicator on friend cards

## Success Metrics

- Users can log an encounter in under 30 seconds
- Encounter list loads in <500ms
- Friend's last encounter displays correctly on friend detail page

## Dependencies

- Epic 1: Friend Management (must be complete)
- Epic 19: Geodata (for location addresses, already implemented)
- Date picker components

## Out of Scope

- Photo attachments (may add in future enhancement)
- Duration tracking
- Automatic encounter detection
- Calendar integration/sync

## Related Epics

- Epic 3: Reminder System (can use encounter data for "time to reach out" reminders)
- Epic 8: Activity Timeline (displays encounters in timeline view)
- Epic 9: Dashboard & Insights (visualizes encounter patterns)
