import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock i18n so $i18n.t(key) echoes the key — lets tests assert on labels without
// depending on translation content. (vi.mock factory is hoisted, so the store is
// built inline here.)
vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

import { jsonResponse, restoreFetch, stubFetch } from '$lib/test/fetch-mock.js';
import { aFriendNote } from '$lib/test/fixtures.js';
import { render, screen } from '$lib/test/render.js';
import NoteEditForm from './NoteEditForm.svelte';

function supersedeValues(): string[] {
  const select = screen.getByLabelText(/subresources\.note\.supersedes/) as HTMLSelectElement;
  return Array.from(select.options).map((option) => option.value);
}

describe('NoteEditForm', () => {
  beforeEach(() => {
    stubFetch(
      jsonResponse({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      }),
    );
  });

  afterEach(() => {
    restoreFetch();
  });

  it('offers only older, not-yet-superseded notes as supersede targets', () => {
    const older = aFriendNote({ createdAt: '2026-01-01T00:00:00.000Z' });
    const supersededByOther = aFriendNote({
      createdAt: '2026-01-02T00:00:00.000Z',
      supersededByNoteId: 'someone-else',
    });
    const edited = aFriendNote({ createdAt: '2026-01-03T00:00:00.000Z' });
    const newer = aFriendNote({ createdAt: '2026-01-04T00:00:00.000Z' });

    render(NoteEditForm, {
      friendId: 'friend-x',
      initialData: edited,
      notes: [newer, edited, supersededByOther, older],
    });

    expect(supersedeValues()).toEqual(['', older.id]);
  });

  it('keeps the note the edited note already supersedes', () => {
    const target = aFriendNote({ createdAt: '2026-01-01T00:00:00.000Z' });
    const edited = aFriendNote({
      createdAt: '2026-01-02T00:00:00.000Z',
      supersedesNoteId: target.id,
    });
    target.supersededByNoteId = edited.id;

    render(NoteEditForm, { friendId: 'friend-x', initialData: edited, notes: [edited, target] });

    expect(supersedeValues()).toEqual(['', target.id]);
  });

  it('sends null for empty selects and trims the content', () => {
    const { component } = render(NoteEditForm, {
      friendId: 'friend-x',
      initialData: aFriendNote({ content: '  Likes hiking  ' }),
      notes: [],
    });
    const form = component as unknown as { getData: () => unknown; isValid: () => boolean };

    expect(form.isValid()).toBe(true);
    expect(form.getData()).toEqual({
      content: 'Likes hiking',
      encounter_id: null,
      source_friend_id: null,
      supersedes_note_id: null,
    });
  });
});
