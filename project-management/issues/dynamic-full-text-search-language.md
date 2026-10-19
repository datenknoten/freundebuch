# Story: Dynamic Full-Text Search Language

**Project:** freundebuch2
**Type:** Story
**Related Epic:** Epic 10, Epic 15
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** Low

---

## Summary

Full-text search always uses the `'german'` text-search config. Users who write in English get poor stemming. Make the search language dynamic. One decision must apply to friend search and to note search.

---

## Current State

The `'german'` config is hard-coded in these places:

- `friends.update_friend_search_vector()` in `database/migrations/1779668400000_german-fts.ts`.
- Every `websearch_to_tsquery` and `ts_headline` call in `apps/backend/src/models/queries/search.sql`.
- The generated column `friends.friend_notes.search_vector` in `database/migrations/1792404740677_friend-notes.ts`.

The user profile has a language setting `preferences.language` (`'en' | 'de'`). `LanguageSchema` in `packages/shared/src/auth.ts` defines it. SQL reads it with the default `COALESCE(bu.preferences->>'language', 'en')` (for example in `apps/backend/src/models/queries/notification-channels.sql`).

---

## Options

### (a) Use the profile setting `preferences.language`

Map `'en'` to `'english'` and `'de'` to `'german'`.

Caveats:

- This setting is the UI language. It is not the language of the content.
- Each row needs a stored vector for the selected config. A change of the setting needs a reindex of all friends and notes of the user.
- A GIN expression index needs a constant config. A per-user config needs a stored vector column.

### (b) Combined vector

Build `to_tsvector('german', x) || to_tsvector('english', x)`. Query with both configs and combine with `||`. No user setting is necessary. The index gets larger.

### (c) `'simple'` config plus trigram

Use `'simple'` (no stemming) and rely on `pg_trgm` for partial matches. This is language-neutral, but stemming is lost.

---

## Acceptance Criteria

- [ ] One decision applies to friend search and to note search together.
- [ ] A language change needs no manual reindex.
- [ ] The existing German stemming tests in `apps/backend/tests/integration/search.test.ts` still pass.
