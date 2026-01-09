# Epic 15: Contact Notes

**Status:** Planned
**Phase:** MVP (Phase 1)
**Priority:** High
**Depends On:** Epic 1 (Contact Management)
**Extracted From:** Epic 1C

## Overview

Add a timestamped notes system to contacts, allowing users to record important details, conversations, and observations about their relationships over time. Notes provide a simple way to capture context that doesn't fit into structured fields.

## Goals

- Allow users to add timestamped notes to any contact
- Provide a chronological history of notes per contact
- Enable basic search within notes
- Keep the interface simple and fast

## Features

### Notes System
- Add timestamped notes to any contact
- Plain text (rich text deferred to future enhancement)
- Edit existing notes
- Delete notes
- Notes displayed in reverse chronological order (newest first)
- Notes are searchable (basic substring search for MVP)

## User Stories

1. As a user, I want to add notes about a contact so I can remember important details
2. As a user, I want to see when I added each note so I have temporal context
3. As a user, I want to edit a note if I made a mistake
4. As a user, I want to delete a note I no longer need
5. As a user, I want to see notes in chronological order so I can follow the history

## Database Schema

```sql
CREATE TABLE contact_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Who wrote the note

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notes_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX idx_contact_notes_created_at ON contact_notes(contact_id, created_at DESC);

-- Full-text search index for notes (basic search)
CREATE INDEX idx_contact_notes_content_search ON contact_notes
    USING GIN (to_tsvector('english', content));
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts/:id/notes` | List notes for contact (paginated) |
| POST | `/api/contacts/:id/notes` | Add new note |
| PUT | `/api/contacts/:id/notes/:noteId` | Update note |
| DELETE | `/api/contacts/:id/notes/:noteId` | Delete note |

## ArkType Validation Schemas

```typescript
import { type } from 'arktype'

// Note create schema
export const noteCreateSchema = type({
  content: 'string > 0',
})

// Note update schema
export const noteUpdateSchema = type({
  content: 'string > 0',
})

// Note list query schema
export const noteListQuerySchema = type({
  'page?': 'string.numeric.parse',
  'limit?': 'string.numeric.parse',
})
```

## Frontend Components

| Component | Description |
|-----------|-------------|
| `NotesList` | Chronological list of notes with timestamps |
| `NoteItem` | Single note display with edit/delete actions |
| `NoteForm` | Text area for adding/editing notes |
| `NotesSection` | Container for notes in contact detail view |

## Implementation Steps

### Step 1: Database Migration
1. Create `contact_notes` table with schema above
2. Add indexes for performance
3. Run migration

### Step 2: Backend
1. Create `contact-notes.sql` with PgTyped queries
2. Generate TypeScript types
3. Add routes to `contacts.ts` for notes CRUD
4. Add validation schemas to shared package

### Step 3: Frontend
1. Create `NotesSection.svelte` component
2. Create `NoteItem.svelte` for individual notes
3. Create `NoteForm.svelte` for add/edit
4. Integrate into `ContactDetail.svelte`
5. Add inline editing support (following Epic 14 patterns)

### Step 4: Search Integration
1. Include notes content in contact search (Epic 10)
2. Add notes to search_vector trigger or search query

## Success Metrics

- Notes list loads in <200ms for 100 notes
- Note creation in <100ms
- Notes search returns results in <300ms
- Test coverage >80%

## Dependencies

- Epic 1: Contact Management (must be complete) - **Done**
- Epic 5: Multi-User Management (for user_id on notes) - **Done**

## Out of Scope

- Rich text/markdown formatting (future enhancement)
- Note attachments/images (future enhancement)
- Note categories/tags (future enhancement)
- Shared notes between users (future enhancement)
- Note templates (future enhancement)

## Related Epics

- **Epic 1:** Contact Management - provides contacts to attach notes to
- **Epic 6:** CalDAV/CardDAV - notes could sync via vCard NOTE property
- **Epic 8:** Activity Timeline - notes could appear in timeline
- **Epic 10:** Search - notes should be searchable

## Testing Strategy

### Unit Tests
- Note validation (empty content rejected)
- Note service methods

### Integration Tests
- CRUD operations for notes
- Pagination of notes list
- Cascade delete when contact is deleted

### E2E Tests
- Add note flow
- Edit note flow
- Delete note with confirmation
- Notes display in contact detail
