import type { ComponentProps } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NoteEditForm from '$lib/components/friends/subresources/NoteEditForm.svelte';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { aFriendNote } from '$lib/test/fixtures.js';
import { useLanguage } from '$lib/test/locale.js';
import { screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';

function renderNoteEditForm(props: ComponentProps<typeof NoteEditForm>) {
  const context = createTestAppContext();
  vi.spyOn(context.api.encounters, 'listEncounters').mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
  });
  return renderWithContext(NoteEditForm, { props, context });
}

function supersedeValues() {
  const select = screen.getByLabelText(/^Replaces note/);
  if (select instanceof HTMLSelectElement) {
    return Array.from(select.options, (option) => option.value);
  }
  throw new InvariantError('the supersede control is not a <select>');
}

describe('NoteEditForm', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('supersede targets', () => {
    it('offers only older, not-yet-superseded notes', () => {
      const older = aFriendNote({ createdAt: '2026-01-01T00:00:00.000Z' });
      const supersededByOther = aFriendNote({
        createdAt: '2026-01-02T00:00:00.000Z',
        supersededByNoteId: 'someone-else',
      });
      const edited = aFriendNote({ createdAt: '2026-01-03T00:00:00.000Z' });
      const newer = aFriendNote({ createdAt: '2026-01-04T00:00:00.000Z' });

      renderNoteEditForm({
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

      renderNoteEditForm({ friendId: 'friend-x', initialData: edited, notes: [edited, target] });

      expect(supersedeValues()).toEqual(['', target.id]);
    });
  });

  describe('getData', () => {
    it('sends null for empty selects and trims the content', () => {
      const { component } = renderNoteEditForm({
        friendId: 'friend-x',
        initialData: aFriendNote({ content: '  Likes hiking  ' }),
        notes: [],
      });

      expect(component.isValid()).toBe(true);
      expect(component.getData()).toEqual({
        content: 'Likes hiking',
        encounterId: null,
        sourceFriendId: null,
        supersedesNoteId: null,
      });
    });
  });
});
