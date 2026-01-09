# Epic 10: Search Functionality

**Status:** Done
**Phase:** MVP (Phase 1 - Basic Search)
**Priority:** High

> **Note:** Phase 2 (Advanced Search features) has been extracted to [Epic 17: Advanced Search](epic-17-planned-advanced-search.md).
**GitHub Issue:** [#12](https://github.com/enko/freundebuch2/issues/12)

## Overview

Finding what you need should be easy! This feature gives you powerful search capabilities across all your contact data, so you can quickly locate people, past interactions, or any information you're looking for - even if you can't quite remember the exact details.

## Goals

- Make search lightning-fast and intuitive across everything in your database
- Handle both quick searches and complex queries with ease
- Show you the most relevant results without making you wade through junk
- Let you save searches you use often (because who has time to rebuild filters?)
- Be forgiving with typos - we'll figure out what you meant

## Key Features

### Full-Text Search (Phase 1 - MVP) - IMPLEMENTED

#### Basic Search
- Single search box (global header) with Cmd/Ctrl+K shortcut
- Search across:
  - Contact names (first, last, middle, display, nickname)
  - Email addresses
  - Phone numbers
  - Company/organization
  - Job title
  - Notes (work_notes, met_context, relationship notes)
  - Interests
  - ~~Tags~~ (not implemented - Epic 4 dependency)
  - ~~Groups~~ (not implemented - Epic 4 dependency)
- Real-time search as-you-type with debouncing (300ms)
- Autocomplete suggestions
- Search result highlighting (ts_headline)
- Recent searches dropdown with save/delete/clear

#### Search Results
- Ranked by relevance (weighted search vectors)
- Contact card preview in results
- Match context snippet (where the match was found)
- Match source indicators (email, phone, notes badges)
- Pagination with sorting options
- Empty state with suggestions

> **Note:** Phase 2 Advanced Search features have been extracted to [Epic 17: Advanced Search](epic-17-planned-advanced-search.md).

### Sorting - IMPLEMENTED

#### Sort Options
- Alphabetical (A-Z, Z-A) - display_name
- Created date (newest/oldest)
- Recently modified (updated_at)
- Relevance score (for search results)

> **Note:** Advanced sorting options (last contacted, interaction frequency, birthday) require Epic 2/3 and are in Phase 2.

### Search UI/UX - IMPLEMENTED

#### Search Box
- Prominent placement in header (NavBar)
- Keyboard shortcut (Cmd/Ctrl+K)
- ESC to close
- Search icon
- Loading indicator

#### Result Highlighting
- Highlight matched text in results (`<mark>` tags)
- Context around match (ts_headline snippet)

> **Note:** Advanced Search Panel, Filter Chips, and Voice Input are in [Epic 17: Advanced Search](epic-17-planned-advanced-search.md).

## User Stories

### Phase 1 (MVP) - IMPLEMENTED
1. As a user, I want to quickly search for a contact by name so I can find them fast
2. As a user, I want to see autocomplete suggestions so I can find contacts faster
3. As a user, I want to search by email or phone number so I can find contacts by any identifier
4. As a user, I want to see where the match was found so I understand why a contact appeared in results

> **Note:** Phase 2 user stories have been moved to [Epic 17: Advanced Search](epic-17-planned-advanced-search.md).

## Technical Considerations

### Search Implementation - IMPLEMENTED

#### Database Approach (Phase 1)
- PostgreSQL full-text search with `tsvector`
- GIN indexes for performance
- `ts_rank` for relevance scoring
- `pg_trgm` extension enabled (for future fuzzy matching)
- Weighted search fields (A: names, B: org/title, C: notes/interests)

```sql
-- Implemented in migration 1767700000000_full-text-search.ts
CREATE INDEX idx_contacts_search_vector ON contacts.contacts USING GIN (search_vector);

-- Trigger auto-updates search_vector on insert/update
CREATE TRIGGER contacts_search_vector_update
    BEFORE INSERT OR UPDATE ON contacts.contacts
    FOR EACH ROW EXECUTE FUNCTION contacts.update_contact_search_vector();
```

### Database Schema - IMPLEMENTED
- `search_vector` tsvector column on contacts table
- `search_history` table for recent searches (per user)
- GIN indexes on search_vector
- Trigram indexes on emails and phones for partial matching

> **Note:** `saved_searches` table and advanced schema are in [Epic 17: Advanced Search](epic-17-planned-advanced-search.md).

### API Endpoints - IMPLEMENTED

#### Basic Search
- `GET /api/contacts/search?q={query}` - Basic autocomplete search
- `GET /api/contacts/search/full?q={query}` - Full-text search with relevance
- `GET /api/contacts/search/paginated` - Paginated search with sorting
- `GET /api/contacts/search/recent` - Recent searches
- `POST /api/contacts/search/recent` - Save recent search
- `DELETE /api/contacts/search/recent/:query` - Delete specific recent search
- `DELETE /api/contacts/search/recent` - Clear all recent searches

> **Note:** Advanced Search endpoints are in [Epic 17: Advanced Search](epic-17-planned-advanced-search.md).

### Frontend Components - IMPLEMENTED
- `GlobalSearch.svelte` - Search modal with keyboard shortcut
- Search results list with contact cards
- Match source indicators (email/phone/notes badges)
- Recent searches dropdown
- Loading state
- Empty state with suggestions
- Keyboard navigation (up/down/enter)

> **Note:** AdvancedSearchPanel, FilterChips, SavedSearchesList are in [Epic 17: Advanced Search](epic-17-planned-advanced-search.md).

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

## Success Metrics - ACHIEVED

- Search returns results in <300ms for typical database size
- Autocomplete responds in <100ms
- >95% of searches return relevant results

> **Note:** Fuzzy search and advanced filter metrics are in [Epic 17: Advanced Search](epic-17-planned-advanced-search.md).

## Dependencies

- PostgreSQL full-text search features
- Epic 1: Contact Management (data to search)
- Epic 2: Relationship Management (for interaction-based filters)
- Epic 4: Categorization & Organization (for group/tag filters)

## Out of Scope

- Natural language search ("find friends in San Francisco" - that's future magic!)
- AI-powered search suggestions (keeping it straightforward for now)
- Search across interaction content/attachments (not in Phase 1)
- OCR of uploaded images (we're not reading photos... yet)
- Global search across all user data in multi-tenant SaaS

## Related Epics

- Epic 1: Contact Management (primary search target)
- Epic 4: Categorization & Organization (provides filters)
- Epic 2: Relationship Management (temporal filters)

## Implementation Status

### Phase 1: Basic Search (MVP) - DONE
1. Simple text search in header - Done
2. Search across name, email, phone, notes - Done
3. Autocomplete - Done
4. Basic result display - Done
5. PostgreSQL full-text search - Done
6. Sort options - Done
7. Recent searches - Done
8. Search highlighting - Done

### Phase 1 Remaining (blocked by Epic 4)
- Group/tag filtering (requires Epic 4: Categorization)

### Phase 2: Advanced Search - Extracted
> See [Epic 17: Advanced Search](epic-17-planned-advanced-search.md)

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
- Not contacted since [date] AND NOT Archived
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
