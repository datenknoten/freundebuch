# Epic 17: Advanced Search

**Status:** Planned
**Phase:** Phase 2
**Priority:** Medium
**Depends On:** Epic 10 (Basic Search), Epic 4 (Categorization)
**Extracted From:** Epic 10 Phase 2

## Overview

Building on the basic search functionality, Advanced Search provides powerful filtering, fuzzy matching, saved searches, and field-specific search capabilities for users who need to find contacts using complex criteria.

## Goals

- Handle complex queries with multiple filters
- Be forgiving with typos through fuzzy matching
- Let users save searches they use often
- Provide field-specific search for targeted results
- Support temporal filters (last contacted, birthday coming up)

## Key Features

### Fuzzy Search
- Typo tolerance (Levenshtein distance)
- Phonetic matching (soundex, metaphone)
- Partial name matching using pg_trgm
- Nickname/alias support
- Configurable fuzziness level

### Advanced Filters
- **Combine multiple filters:**
  - Group(s) AND/OR logic
  - Tag(s) AND/OR logic
  - Date ranges (created, last contacted, birthday)
  - Custom fields
  - Relationship types
  - Favorites only
  - Archived/active status

### Saved Searches
- Save filter combinations
- Name and organize saved searches
- Quick access to saved searches
- Edit saved searches
- Share saved searches (multi-user)
- Default search on dashboard

### Temporal Filters
- "Last contacted" date range (requires Epic 2)
- "Not contacted since" [date] (requires Epic 2)
- "Created between" [date range]
- "Birthday in next" [X days]
- "Added in last" [X days/weeks/months]

### Field-Specific Search
- Search only in specific fields:
  - Name only
  - Email only
  - Notes only
  - Tags only
- Faster, more targeted results

### Multi-Level Sort
- Primary sort + secondary sort
- Save sort preferences
- Per-view sort settings

### Advanced Search UI
- Collapsible/expandable filter panel
- Filter chips (show active filters)
- Clear all filters
- Filter presets
- Mobile-friendly filter drawer

## User Stories

1. As a user, I want to filter by group and tag together so I can find specific subsets
2. As a user, I want to save common searches so I don't have to rebuild them
3. As a user, I want to find contacts I haven't spoken to in 6 months so I can reconnect
4. As a user, I want fuzzy search to find contacts even if I misspell their name
5. As a user, I want to sort results by last contact date so I can see who I talked to recently
6. As a user, I want to search only in notes so I can find contacts by conversation topics

## Technical Considerations

### Database Schema

```sql
-- Saved searches
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    sort_field VARCHAR(50),
    sort_direction VARCHAR(4) DEFAULT 'asc',
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_saved_search_name UNIQUE (user_id, name)
);

CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
```

### Fuzzy Matching with pg_trgm

```sql
-- Enable trigram extension (already done in Epic 10)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram indexes on name fields
CREATE INDEX idx_contacts_display_name_trgm 
    ON contacts.contacts USING GIN (display_name gin_trgm_ops);
CREATE INDEX idx_contacts_name_first_trgm 
    ON contacts.contacts USING GIN (name_first gin_trgm_ops);
CREATE INDEX idx_contacts_name_last_trgm 
    ON contacts.contacts USING GIN (name_last gin_trgm_ops);

-- Fuzzy search query example
SELECT * FROM contacts.contacts
WHERE display_name % 'Jon Smth'  -- Finds "John Smith"
ORDER BY similarity(display_name, 'Jon Smth') DESC;
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search/advanced` | Advanced search with filters (POST for complex JSON) |
| GET | `/api/search/saved` | List saved searches |
| POST | `/api/search/saved` | Create saved search |
| PUT | `/api/search/saved/:id` | Update saved search |
| DELETE | `/api/search/saved/:id` | Delete saved search |
| GET | `/api/search/saved/:id/execute` | Execute saved search |

### Frontend Components

| Component | Description |
|-----------|-------------|
| `AdvancedSearchPanel` | Collapsible filter panel |
| `FilterChips` | Display active filters as chips |
| `SavedSearchesList` | List of saved searches |
| `SaveSearchModal` | Dialog to save current search |
| `DateRangeFilter` | Date range picker for filters |
| `GroupTagFilter` | Multi-select for groups/tags |
| `FuzzySearchToggle` | Enable/disable fuzzy matching |

## Success Metrics

- Fuzzy search finds contacts with 1-2 character typos
- Advanced filters apply quickly (<500ms)
- Saved searches execute as fast as regular searches
- Filter UI is intuitive on both desktop and mobile

## Dependencies

- Epic 10: Basic Search (foundation) - **Done**
- Epic 4: Categorization & Organization (for group/tag filters) - **Planned**
- Epic 2: Relationship Management (for "last contacted" filters) - **Planned**

## Out of Scope

- Natural language search ("find friends in San Francisco")
- AI-powered search suggestions
- Search across interaction content/attachments
- OCR of uploaded images
- Voice input

## Related Epics

- **Epic 10:** Basic Search - provides foundation
- **Epic 4:** Categorization - provides group/tag data
- **Epic 2:** Relationship Management - provides interaction data for temporal filters

## Example Search Queries

### Fuzzy
- "Jon Smit" -> finds "John Smith"
- "kate" -> finds "Catherine", "Katie", "Kate"

### Advanced Filters
- Group: "Friends" AND Tag: "Hiking" AND Last contacted: ">90 days ago"
- Birthday in next 7 days AND Group: "Family"
- Not contacted since [date] AND NOT Archived
- Created in last 30 days AND Favorites

## Search Keyboard Shortcuts

Existing shortcuts from Epic 10:
- `Cmd/Ctrl + K`: Open search
- `Esc`: Close search/clear
- `Enter`: Go to first result
- Arrow up/down: Navigate results

New shortcuts for Advanced Search:
- `Cmd/Ctrl + Shift + K`: Open advanced search panel
- `Cmd/Ctrl + S` (in search): Save current search
