# Epic 4: Categorization & Organization

**Status:** Planned
**Phase:** MVP (Phase 1)
**Priority:** High
**GitHub Issue:** [#6](https://github.com/enko/freundebuch2/issues/6)

## Overview

Everyone organizes their friendships differently, and that's totally fine! This feature gives you flexible ways to structure your Freundebuch however makes sense for your life. The core concept is **Circles** - a free-form, flexible way to organize the people you care about.

## Goals

- Provide a single, intuitive way to organize friends: Circles
- Make it effortless to create, assign, and filter by circles
- Support both flat lists and nested hierarchies - your choice
- Let you organize however you think (work circle, hiking circle, book club, family)

## Key Features

### Circles

Circles are the primary way to organize friends in Freundebuch. They're designed to be as flexible as you need - use them like simple tags, or build complex hierarchies. It's up to you.

**Free-form Creation**
- Create circles on the fly while editing a friend's page
- Type a new circle name and it's created instantly
- Autocomplete suggests existing circles as you type
- No need to pre-define circles in settings first

**Flexible Structure**
- Circles can be flat (just a list of circles)
- Circles can be nested (Family > Siblings, Work > Engineering Team)
- Depth is unlimited - nest as deep as makes sense
- Move circles around to reorganize anytime

**Visual Organization**
- Assign colors to circles for quick visual recognition
- Circle chips appear on friend cards and pages
- Filter the friend list by one or multiple circles
- See circle counts to know how many friends are in each

**Circle Features**
- A friend can belong to multiple circles
- Rename circles and all friends update automatically
- Merge duplicate circles together
- Delete circles (friends remain, just unassigned)
- Set circle-specific reminder thresholds (e.g., catch up with work friends monthly)

**Faceted Search Integration**
- Circles appear as a facet in search results
- See how many friends match in each circle
- Combine circle filters with other facets (city, organization, etc.)
- Drill down: filter by circle, then refine with other criteria
- Facet counts update dynamically as you filter

### Favorites

- Star friends to mark them as favorites
- Favorites appear first in lists and on the dashboard
- Quick filter to show only favorites
- Toggle favorite from any friend view

### Archiving

- Archive friends you've lost touch with instead of deleting
- Archived friends are hidden from normal views and search
- Easily unarchive if you reconnect
- Optionally add a note about why you archived
- Archived friends don't trigger reminders

## User Stories

1. As a user, I want to create circles freely so I can organize friends however makes sense to me
2. As a user, I want to add a friend to multiple circles so I can find them in different contexts
3. As a user, I want to nest circles so I can have both broad categories and specific subcircles
4. As a user, I want to filter by circles so I can focus on one area of my life at a time
5. As a user, I want to mark favorites so my closest friends are always easy to find
6. As a user, I want to archive old friends so they don't clutter my active Freundebuch
7. As a user, I want to set reminders per circle so I can stay in touch at the right cadence

## Technical Considerations

### Database Schema

```
friends.circles
├── id (PK)
├── external_id (UUID)
├── user_id (FK → auth.users)
├── name (VARCHAR)
├── color (VARCHAR, nullable) - hex color code
├── parent_circle_id (FK → circles, nullable) - for hierarchy
├── sort_order (INTEGER) - for custom ordering
├── reminder_days (INTEGER, nullable) - circle-specific reminder threshold
├── created_at
└── updated_at

friends.friend_circles (junction table)
├── id (PK)
├── friend_id (FK → friends.friends)
├── circle_id (FK → friends.circles)
├── created_at
└── UNIQUE(friend_id, circle_id)

friends.friends (additions)
├── is_favorite (BOOLEAN, default false)
├── archived_at (TIMESTAMP, nullable)
└── archive_reason (TEXT, nullable)
```

### Indexes
- `idx_circles_user_id` on circles(user_id)
- `idx_circles_parent` on circles(parent_circle_id)
- `idx_friend_circles_friend` on friend_circles(friend_id)
- `idx_friend_circles_circle` on friend_circles(circle_id)
- `idx_friends_favorite` on friends(user_id, is_favorite) WHERE is_favorite = true
- `idx_friends_archived` on friends(user_id, archived_at) WHERE archived_at IS NOT NULL

### API Endpoints

**Circles**
- `GET /api/circles` - List all circles with hierarchy and friend counts
- `POST /api/circles` - Create new circle
- `PUT /api/circles/:id` - Update circle (name, color, parent, reminder_days)
- `DELETE /api/circles/:id` - Delete circle
- `POST /api/circles/:id/merge` - Merge another circle into this one
- `PUT /api/circles/reorder` - Update sort order of circles

**Friend-Circle Assignment**
- `POST /api/friends/:id/circles` - Set circles for a friend (replaces existing)
- `POST /api/friends/:id/circles/add` - Add friend to additional circles
- `DELETE /api/friends/:id/circles/:circleId` - Remove friend from a circle

**Favorites & Archive**
- `POST /api/friends/:id/favorite` - Toggle favorite status
- `POST /api/friends/:id/archive` - Archive friend (with optional reason)
- `POST /api/friends/:id/unarchive` - Restore archived friend

**Filtering & Faceted Search**
- `GET /api/friends?circles=id1,id2` - Filter by circles (OR)
- `GET /api/friends?favorites=true` - Filter favorites only
- `GET /api/friends?archived=true` - Show archived friends
- `GET /api/friends?archived=only` - Show only archived friends
- `GET /api/friends/facets` - Include circles in facet response with counts

### Frontend Components

**Circle Management**
- Circle input with autocomplete (create-on-type)
- Circle chips with colors (on friend cards/pages)
- Circle tree view for hierarchy management
- Circle settings modal (color, parent, reminder threshold)
- Drag-and-drop circle reordering

**Filtering & Navigation**
- Circle filter sidebar/dropdown
- Multi-circle filter (show friends in any selected circle)
- Favorite filter toggle
- Archive toggle (show/hide archived)
- Circle facet in search results with counts
- Combined filtering with other facets (city, organization, job title)

**Friend Page**
- Circle assignment section
- Favorite star toggle
- Archive action in menu

**Bulk Operations**
- Multi-select friends
- Bulk add to circle
- Bulk archive

## Success Metrics

- Users can create circles effortlessly while adding friends
- Circle autocomplete feels instant and helpful
- Filtering by circles is fast and intuitive
- Hierarchy is optional and doesn't complicate simple use cases
- Favorites provide quick access to important friends
- Archive keeps the active list clean without losing data

## Dependencies

- Epic 1: Friend Management (must be complete)
- Color picker component
- Autocomplete/combobox component

## Out of Scope

- Smart circles (automatic assignment based on rules) - future enhancement
- Circle sharing between users - see Epic 5: Multi-User Management
- Circle templates or presets
- Automated circle suggestions

## Related Epics

- Epic 1: Friend Management (friends to be organized)
- Epic 5: Multi-User Management (circle sharing)
- Epic 10: Search & Faceted Filtering (circles as a searchable facet)
