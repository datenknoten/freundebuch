# Epic 2: Relationship Management

**Status:** Planned
**Phase:** Core Functionality (Phase 2)
**Priority:** High

## Overview

Here's where the magic happens! This feature is all about tracking the actual story of your relationships with people. We're transforming your contact database into a genuine relationship management system by capturing your interaction history and helping you understand how your relationships are doing.

## Goals

- Make it easy to log and track every interaction you have with people
- Give you clear visibility into how healthy your relationships are
- Help you remember and document those special shared experiences
- Build a comprehensive story of each relationship over time

## Key Features

### Interaction Log
- Manual recording of meetings, calls, messages, emails
- Each interaction includes:
  - Date and time
  - Interaction type (meeting, call, message, email, other)
  - Duration (optional)
  - Location (optional)
  - Free-text notes
  - Participants (for group interactions)
  - Attachments (photos, documents)

### Last Interaction Tracking
- Automatic display of the most recent contact
- Time span since last contact (e.g., "23 days ago")
- Visual indicators for contacts not reached out to in a while

### Relationship Quality Metrics
- Contact frequency tracking (average time between interactions)
- Interaction trends over time (increasing/decreasing)
- Optional categorization (close friend, acquaintance, professional, etc.)
- Relationship strength indicators

### Shared Experiences
- Link events/activities with multiple contacts
- Photo albums for shared experiences
- Group interaction logging
- Event timeline view

## User Stories

1. As a user, I want to log when I meet or talk with someone so I can maintain a history of our interactions
2. As a user, I want to see when I last contacted someone so I know if I need to reach out
3. As a user, I want to attach photos from events so I can remember shared experiences
4. As a user, I want to categorize the quality of my relationships so I can prioritize my time
5. As a user, I want to see interaction trends so I can understand which relationships are growing or fading

## Technical Considerations

### Database Schema
- `interactions` table with contact_id, type, date, notes, duration, location
- `interaction_participants` for multi-person interactions
- `interaction_attachments` for photos/files
- `shared_experiences` for grouping related interactions
- `relationship_categories` for quality/type classifications

### API Endpoints
- `GET /api/contacts/:id/interactions` - Get all interactions for a contact
- `POST /api/interactions` - Create new interaction
- `PUT /api/interactions/:id` - Update interaction
- `DELETE /api/interactions/:id` - Delete interaction
- `GET /api/contacts/:id/stats` - Get relationship metrics
- `POST /api/experiences` - Create shared experience
- `GET /api/experiences/:id` - Get shared experience details

### Frontend Components
- Interaction log timeline
- Quick-add interaction form
- Interaction detail view with attachments
- Relationship metrics dashboard
- Shared experience gallery
- Interaction type selector
- Duration and location pickers

## Success Metrics

- Users can easily log interactions in under 30 seconds
- Relationship metrics accurately reflect interaction patterns
- Attachment upload and display working smoothly
- Timeline view performs well with hundreds of interactions

## Dependencies

- Epic 1: Contact Management (must be complete)
- File storage system for attachments
- Date/time picker components

## Out of Scope

- Automatic interaction detection (like parsing your emails - that's for later!)
- Social media integration
- AI-powered interaction suggestions
- Video/audio call recording

## Related Epics

- Epic 3: Reminder System (uses interaction data)
- Epic 8: Activity Timeline (displays interactions)
- Epic 9: Dashboard & Insights (visualizes relationship metrics)
