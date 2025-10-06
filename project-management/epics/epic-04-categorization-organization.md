# Epic 4: Categorization & Organization

**Status:** Planned
**Phase:** MVP (Phase 1)
**Priority:** High

## Overview

Everyone organizes their contacts differently, and that's totally fine! This feature gives you flexible ways to structure your contact database however makes sense for your life - whether that's by groups, tags, or whatever system works for you.

## Goals

- Give you multiple ways to organize and categorize your contacts
- Make it super easy to filter and find people
- Support both simple lists and complex hierarchies - whatever you need
- Let you create your own categories that match how you think

## Key Features

### Groups
- Predefined groups (Family, Friends, Work, Club, Neighbors)
- User-defined custom groups
- Hierarchical groups (e.g., Friends > School Friends > College Friends)
- Multi-group membership (one contact can belong to multiple groups)
- Group-specific views and filtering
- Group-level settings (e.g., reminder thresholds)
- Contact count per group

### Tags
- Free-form tag assignment (e.g., #Hiking, #Cooking, #Tech)
- Tag autocomplete during entry
- Tag cloud for quick navigation
- Multi-tag filtering
- Tag management (rename, merge, delete)
- Popular tags widget
- Color coding for tags (optional)

### Favorites
- Star/favorite marking for important contacts
- Quick access to favorites list
- Favorites widget on dashboard
- Sort contacts by favorite status

### Archiving
- Archive contacts instead of deleting
- Separate views for active vs. archived contacts
- Unarchive functionality
- Archive reasons/notes (optional)
- Archived contacts excluded from reminders and searches by default

## User Stories

1. As a user, I want to organize contacts into groups so I can see related people together
2. As a user, I want to create hierarchical groups so I can organize contacts with different levels of detail
3. As a user, I want to tag contacts with interests so I can find people who share hobbies
4. As a user, I want to mark certain contacts as favorites so I can quickly access my most important relationships
5. As a user, I want to archive old contacts so they don't clutter my active list but I don't lose the data
6. As a user, I want to filter contacts by multiple tags so I can find specific combinations

## Technical Considerations

### Database Schema
- `groups` table with name, parent_group_id, user_id
- `contact_groups` junction table (many-to-many)
- `tags` table with name, color, user_id
- `contact_tags` junction table (many-to-many)
- `favorites` with contact_id, user_id, timestamp
- Add `archived` boolean and `archived_at` timestamp to contacts table
- Indexes on group_id, tag_id, favorite status, archived status

### API Endpoints
- `GET /api/groups` - List all groups with hierarchy
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `GET /api/groups/:id/contacts` - Get contacts in group
- `GET /api/tags` - List all tags with usage count
- `POST /api/tags` - Create new tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag
- `POST /api/contacts/:id/groups` - Add contact to groups
- `POST /api/contacts/:id/tags` - Add tags to contact
- `POST /api/contacts/:id/favorite` - Toggle favorite
- `POST /api/contacts/:id/archive` - Archive/unarchive contact

### Frontend Components
- Group tree/hierarchy view
- Group selector (with hierarchy)
- Tag input with autocomplete
- Tag cloud visualization
- Favorite toggle button
- Archive/unarchive actions
- Multi-select for bulk operations
- Filter panel with groups, tags, favorites, archived
- Drag-and-drop for group management

## Success Metrics

- Users can organize contacts into groups and apply tags easily
- Hierarchical groups display and function correctly
- Filtering by groups, tags, and favorites works smoothly
- Archive functionality properly excludes contacts from active views
- Tag autocomplete suggests relevant tags quickly

## Dependencies

- Epic 1: Contact Management (must be complete)
- Multi-select UI components
- Drag-and-drop library (for group hierarchy management)

## Out of Scope

- Smart groups (dynamic groups based on rules - that's a future enhancement)
- Group sharing between users (we'll add that with multi-user support)
- Tag synonyms or tag relationships
- Automated tagging suggestions (keeping it manual for now)

## Related Epics

- Epic 1: Contact Management (contacts to be organized)
- Epic 5: Multi-User Management (group sharing)
- Epic 10: Search Functionality (search by groups/tags)
