# Epic 8: Activity Timeline

**Status:** Planned
**Phase:** Core Functionality (Phase 2)
**Priority:** Medium
**GitHub Issue:** [#10](https://github.com/enko/freundebuch2/issues/10)

## Overview

Ever wish you could see the whole story of your relationship with someone? This timeline feature gives you exactly that - a beautiful chronological view of all your interactions and events, whether you want to see one person's history or get the big picture across your whole network.

## Goals

- Show your interaction history in a timeline that's easy to browse and understand
- Let you view activity for one person or see everything across all your contacts
- Make it quick to review what's happened recently (or way back when)
- Offer different ways to visualize your activities - whatever helps you best
- Keep it super fast to add new interactions on the fly

## Key Features

### Per-Contact Timeline
- Chronological list of all interactions with a specific contact
- Display of:
  - Interactions (meetings, calls, messages)
  - Birthdays and anniversaries
  - Notes with timestamps
  - Reminders (past and upcoming)
  - Contact changes/updates
- Filter by interaction type
- Filter by date range
- Expandable/collapsible entries
- Rich media display (photos, attachments)
- Edit/delete interaction directly from timeline

### Global Timeline
- Unified view of all activities across all contacts
- Filter by:
  - Date range (today, this week, this month, custom)
  - Contact (single or multiple)
  - Interaction type
  - Group/tag
- Search within timeline
- Pagination or infinite scroll
- Contact avatar/thumbnail in each entry
- Jump to contact detail from entry

### Timeline Visualizations

#### Timeline View
- Vertical timeline with dates
- Icons for interaction types
- Color coding by type or contact group
- Today indicator
- Cluster similar events on same day

#### Calendar View
- Monthly calendar grid
- Day cells show interaction count
- Click day to see details
- Different colors for interaction types
- Birthday/anniversary indicators

#### List View
- Compact list format
- Sortable columns
- Quick actions (edit, delete)
- Bulk selection
- Export list to CSV

### Quick Entry
- Floating action button for quick add
- Quick-add modal/drawer
- Templates for common interaction types:
  - "Had coffee"
  - "Phone call"
  - "Sent birthday wishes"
  - "Family dinner"
- Recently contacted auto-suggestions
- Smart defaults (date=today, type=last used)
- Keyboard shortcuts

### Timeline Navigation
- Jump to date
- "Today" button
- Date range picker
- Previous/next navigation
- Scroll to top/bottom
- Bookmark specific dates

## User Stories

1. As a user, I want to see all my interactions with a person in chronological order so I can review our relationship history
2. As a user, I want to see what I did today/this week so I can track my social activities
3. As a user, I want to filter the timeline by interaction type so I can see only phone calls or only meetings
4. As a user, I want to quickly add an interaction I just had so I can log it while it's fresh
5. As a user, I want to view my activities in a calendar so I can see patterns over time
6. As a user, I want to see all interactions with a specific group so I can review team activities
7. As a user, I want to edit an interaction from the timeline if I made a mistake

## Technical Considerations

### Database Schema
- Reuse `interactions` table from Epic 2
- Add `activity_feed` view that combines:
  - Interactions
  - Contact changes (from audit log)
  - Reminders
  - Notes
- Indexes on date fields for fast timeline queries
- Composite index on (user_id, date) for global timeline

### API Endpoints
- `GET /api/timeline/contacts/:id` - Get contact timeline
- `GET /api/timeline/global` - Get global timeline with filters
- `GET /api/timeline/calendar/:year/:month` - Get calendar view data
- `POST /api/timeline/quick-add` - Quick add interaction
- `GET /api/timeline/templates` - Get quick-add templates
- `GET /api/timeline/stats` - Get timeline statistics (for insights)

### Frontend Components
- Timeline container (virtualized for performance)
- Timeline entry component
  - Interaction entry
  - Birthday entry
  - Note entry
  - Reminder entry
- Timeline filters panel
- Calendar view component
- List view table
- Quick-add modal/drawer
- Template selector
- Date range picker
- Interaction type filter chips
- Empty state (no activities)
- Loading skeleton

### Performance Optimization
- Virtual scrolling for long timelines
- Lazy loading of timeline entries
- Pagination (load more on scroll)
- Caching of timeline data
- Debounced filtering
- Optimistic UI updates for new entries

### Data Aggregation
- Group interactions by day
- Count interactions per day for calendar view
- Calculate streaks (consecutive days with activity)
- Identify gaps (long periods without interaction)

## Success Metrics

- Timeline loads in <1 second for typical use (100 interactions)
- Smooth scrolling with 1000+ entries (virtual scroll)
- Quick-add interaction completes in <500ms
- Filter updates apply in <300ms
- Calendar view loads month data in <500ms

## Dependencies

- Epic 2: Relationship Management (interaction data)
- Epic 1: Contact Management (contact data)
- Virtual scroll library (e.g., `svelte-virtual-list`)
- Date handling library (e.g., `date-fns`)
- Calendar component library

## Out of Scope

- Real-time collaborative timeline (no live multi-user editing for now)
- AI-generated timeline summaries (future enhancement)
- Animated timeline transitions (we're keeping it snappy and performant)
- Export timeline as PDF (you can use the general export feature from Epic 7)
- Social media integration to pull posts/likes (keeping it simple)

## Related Epics

- Epic 2: Relationship Management (provides interaction data)
- Epic 9: Dashboard & Insights (aggregates timeline data)
- Epic 3: Reminder System (shows upcoming reminders in timeline)

## Implementation Notes

### Timeline Entry Types

Each entry should have:
- **Type:** interaction, birthday, note, reminder, system
- **Icon:** visual indicator
- **Timestamp:** date and time
- **Contact:** who it relates to
- **Content:** description/notes
- **Actions:** edit, delete, view details

### Virtual Scroll Implementation

For performance with large datasets:
```javascript
// Pseudo-code
<VirtualList
  items={timelineEntries}
  itemHeight={80}
  bufferSize={5}
>
  <TimelineEntry />
</VirtualList>
```

### Calendar View Data Structure

```json
{
  "2025-10-01": {
    "interactions": 3,
    "birthdays": 1,
    "reminders": 0
  },
  "2025-10-02": {
    "interactions": 1,
    "birthdays": 0,
    "reminders": 2
  }
}
```

## Testing Strategy

- Test with empty timeline (new user)
- Test with very large timeline (10,000+ entries)
- Test all filter combinations
- Test quick-add with all templates
- Test calendar navigation
- Test performance with concurrent users
- Test on mobile devices (touch interactions)
