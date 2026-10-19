# Story: Promote Note Content to Structured Fields

**Project:** freundebuch2
**Type:** Story
**Related Epic:** Epic 15
**Phase:** Phase 1.5 (Post-MVP Enhancement)
**Priority:** Low

---

## Summary

A note can contain data that belongs in a structured field. Example: "Anna got a new mobile number: 0170 …". This note should become a proposed edit to the phone numbers of Anna.

---

## Current State

Notes are free text in `friends.friend_notes` (`database/migrations/1792404740677_friend-notes.ts`). No link exists from a note to a structured field. The user must copy the value into the edit form by hand.

`friends.friend_changes` is the CardDAV sync log. Only database triggers write to it (for example `database/migrations/1779668700000_log-archive-as-carddav-change.ts`). Thus it must not hold the link from a note to a field. Store this link on the suggestion.

---

## Options

The options are in order of complexity.

1. **Detectors without AI.** Detect phone numbers, email addresses, URLs, and dates in the note. Show a chip below the note with "Add to friend". Reuse `normalizePhoneNumber` (`packages/shared/src/phone-utils.ts`, used by the backend phone normalization in `apps/backend/src/services/phone-normalization.ts`).
2. **Select text.** The user selects text in the note and clicks "Use as phone/email/address/job". The edit form opens with the value filled in.
3. **Suggestions table.** A `suggestions` table stores the friend, the field type, the value, the source note id, and the operation (`add` or `replace <id>`). An accept/reject UI shows the suggestions.
4. **MCP assistant.** An MCP assistant reads notes and writes suggestions into the table from option 3.

### Open Point

Replace or add: a new number usually replaces the old one. Decide how the UI selects the field to replace.

---

## Acceptance Criteria

- [ ] An accepted suggestion writes the field and keeps a link from the field change to the source note.
- [ ] A rejected suggestion changes nothing.
