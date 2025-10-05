# Epic 10: Search Functionality

**Status:** Planned
**Phase:** MVP (Phase 1 - Basic), Phase 2 (Advanced)
**Priority:** High (Basic), Medium (Advanced)

## Overview

Powerful search across all contact data. This feature enables users to quickly find contacts, interactions, and information using various search methods and filters.

## Goals

- Enable fast, intuitive search across all contact data
- Support both simple and advanced search scenarios
- Provide relevant, accurate results
- Allow saving common searches for reuse
- Handle typos and fuzzy matching gracefully

## Key Features

### Full-Text Search (Phase 1 - MVP)

#### Basic Search
- Single search box (global header)
- Search across:
  - Contact names (first, last, middle)
  - Email addresses
  - Phone numbers
  - Company/organization
  - Notes
  - Tags
  - Groups
- Real-time search as-you-type
- Autocomplete suggestions
- Search result highlighting
- Recent searches dropdown

#### Search Results
- Ranked by relevance
- Contact card preview in results
- Match context snippet (where the match was found)
- Result count
- Pagination or infinite scroll
- Empty state with suggestions

### Advanced Search (Phase 2)

#### Fuzzy Search
- Typo tolerance (Levenshtein distance)
- Phonetic matching (soundex, metaphone)
- Partial name matching
- Nickname/alias support
- Configurable fuzziness level

#### Advanced Filters
- **Combine multiple filters:**
  - Group(s) AND/OR logic
  - Tag(s) AND/OR logic
  - Date ranges (created, last contacted, birthday)
  - Custom fields
  - Relationship types
  - Favorites only
  - Archived/active status

#### Saved Searches
- Save filter combinations
- Name and organize saved searches
- Quick access to saved searches
- Edit saved searches
- Share saved searches (multi-user)
- Default search on dashboard

#### Temporal Filters
- "Last contacted" date range
- "Not contacted since" [date]
- "Created between" [date range]
- "Birthday in next" [X days]
- "Added in last" [X days/weeks/months]

#### Field-Specific Search
- Search only in specific fields:
  - Name only
  - Email only
  - Notes only
  - Tags only
- Faster, more targeted results

### Sorting

#### Sort Options
- Alphabetical (A-Z, Z-A)
- Last contacted (newest/oldest)
- Created date (newest/oldest)
- Interaction frequency (most/least)
- Birthday (soonest)
- Recently modified
- Relevance score (for search results)

#### Multi-Level Sort
- Primary sort + secondary sort
- Save sort preferences
- Per-view sort settings

### Search UI/UX

#### Search Box
- Prominent placement in header
- Keyboard shortcut (Cmd/Ctrl+K)
- Clear button
- Search icon
- Loading indicator
- Voice input (optional)

#### Advanced Search Panel
- Collapsible/expandable
- Filter chips (show active filters)
- Clear all filters
- Filter presets
- Mobile-friendly filter drawer

#### Result Highlighting
- Highlight matched text in results
- Different colors for different match types
- Context around match (snippet)

## User Stories

### Phase 1 (MVP)
1. As a user, I want to quickly search for a contact by name so I can find them fast
2. As a user, I want to see autocomplete suggestions so I can find contacts faster
3. As a user, I want to search by email or phone number so I can find contacts by any identifier
4. As a user, I want to see where the match was found so I understand why a contact appeared in results

### Phase 2 (Advanced)
5. As a user, I want to filter by group and tag together so I can find specific subsets
6. As a user, I want to save common searches so I don't have to rebuild them
7. As a user, I want to find contacts I haven't spoken to in 6 months so I can reconnect
8. As a user, I want fuzzy search to find contacts even if I misspell their name
9. As a user, I want to sort results by last contact date so I can see who I talked to recently
10. As a user, I want to search only in notes so I can find contacts by conversation topics

## Technical Considerations

### Search Implementation

#### Database Approach (Phase 1)
- PostgreSQL full-text search
- `tsvector` columns for searchable text
- GIN indexes for performance
- `ts_rank` for relevance scoring

```sql
CREATE INDEX contacts_search_idx ON contacts
USING GIN (to_tsvector('english', name || ' ' || email || ' ' || notes));
```

#### Advanced Search (Phase 2)
- Consider PostgreSQL `pg_trgm` for fuzzy matching
- Trigram similarity scoring
- Combination of full-text and trigram indexes

#### Search Engine (Future/Optional)
- For very large datasets, consider:
  - Elasticsearch
  - Meilisearch
  - Typesense
- Provides better ranking and fuzzy matching

### Database Schema
- `saved_searches` table with user_id, name, filters (JSON), sort
- Add `search_vector` column to contacts table
- `search_history` table for recent searches (per user)
- Indexes on frequently searched fields

### API Endpoints

#### Basic Search
- `GET /api/search?q={query}` - Basic search
- `GET /api/search/autocomplete?q={query}` - Autocomplete
- `GET /api/search/recent` - Recent searches
- `DELETE /api/search/recent/:id` - Clear recent search

#### Advanced Search
- `POST /api/search/advanced` - Advanced search with filters (POST for complex JSON)
- `GET /api/search/saved` - List saved searches
- `POST /api/search/saved` - Create saved search
- `PUT /api/search/saved/:id` - Update saved search
- `DELETE /api/search/saved/:id` - Delete saved search
- `GET /api/search/saved/:id/execute` - Execute saved search

### Frontend Components
- SearchBar (global header)
- AutocompleteDropdown
- SearchResults list
- SearchResultCard
- AdvancedSearchPanel
- FilterChips
- SavedSearchesList
- SortSelector
- EmptySearchState
- SearchLoadingState

### Performance Optimization
- Debounce search input (300ms)
- Cancel previous requests on new input
- Cache search results (short TTL)
- Limit autocomplete to 10 results
- Lazy load search results
- Virtual scroll for large result sets
- Index optimization
- Query explain/analyze for slow queries

### Relevance Ranking

Score factors:
1. Exact match > partial match
2. Name match > email/phone > notes
3. Start of word > middle of word
4. Favorites weighted higher
5. Recently contacted weighted higher
6. Interaction frequency bonus

### Search Analytics (Optional)
- Track search queries
- Identify common searches (for saved search suggestions)
- Monitor search performance
- Zero-result searches (for improvement)

## Success Metrics

- Search returns results in <300ms for typical database size
- Autocomplete responds in <100ms
- Fuzzy search finds contacts with 1-2 character typos
- >95% of searches return relevant results
- Advanced filters apply quickly (<500ms)
- Saved searches execute as fast as regular searches

## Dependencies

- PostgreSQL full-text search features
- Epic 1: Contact Management (data to search)
- Epic 2: Relationship Management (for interaction-based filters)
- Epic 4: Categorization & Organization (for group/tag filters)

## Out of Scope

- Natural language search ("find friends in San Francisco")
- AI-powered search suggestions
- Search across interaction content/attachments (Phase 1)
- OCR of uploaded images
- Global search across all user data in multi-tenant SaaS

## Related Epics

- Epic 1: Contact Management (primary search target)
- Epic 4: Categorization & Organization (provides filters)
- Epic 2: Relationship Management (temporal filters)

## Implementation Phases

### Phase 1: Basic Search (MVP)
1. Simple text search in header
2. Search across name, email, phone, notes
3. Autocomplete
4. Basic result display
5. PostgreSQL full-text search

### Phase 1B: Improved Search
6. Group/tag filtering
7. Sort options
8. Recent searches

### Phase 2: Advanced Search
9. Advanced filter panel
10. Fuzzy search (pg_trgm)
11. Saved searches
12. Field-specific search
13. Complex filter combinations
14. Search highlighting

## Testing Strategy

- Test with empty database
- Test with 10, 100, 1000, 10000 contacts
- Test special characters in search
- Test very long search queries
- Test concurrent searches
- Test all filter combinations
- Performance benchmarking
- Search result relevance testing
- Typo tolerance testing
- Mobile usability testing

## Example Search Queries

### Basic
- "John" → finds John Smith, Johnny Doe, John.doe@example.com
- "555-1234" → finds contacts with that phone number
- "hiking" → finds contacts tagged #hiking or mentioned in notes

### Advanced
- Group: "Friends" AND Tag: "Hiking" AND Last contacted: ">90 days ago"
- Birthday in next 7 days AND Group: "Family"
- Not contacted since 2024-01-01 AND NOT Archived
- Created in last 30 days AND Favorites

### Fuzzy
- "Jon Smit" → finds "John Smith"
- "kate" → finds "Catherine", "Katie", "Kate"

## Search Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open search
- `Esc`: Close search/clear
- `Enter`: Go to first result
- `↑/↓`: Navigate results
- `Cmd/Ctrl + Enter`: Open in new tab
