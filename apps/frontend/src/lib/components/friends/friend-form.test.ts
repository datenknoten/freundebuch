import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FriendForm from '$lib/components/friends/FriendForm.svelte';
import { aFriend } from '$lib/test/fixtures.js';
import { useLanguage } from '$lib/test/locale.js';
import { control, fireEvent, labelFor, screen, tick, waitFor, within } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import type { FriendResponse } from '$shared';

function renderFriendForm(friend?: FriendResponse) {
  const context = createTestAppContext();
  const deletePhoto = vi.spyOn(context.stores.friends, 'deletePhoto').mockResolvedValue(undefined);
  renderWithContext(FriendForm, { props: { friend }, context });
  return { deletePhoto };
}

const ADA_WITH_PHOTO = aFriend({ id: 'f1', displayName: 'Ada', photoUrl: '/photos/ada.jpg' });

describe('FriendForm', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fields', () => {
    it('gives every field a label and marks display name required outside the placeholder', () => {
      renderFriendForm();

      for (const id of [
        'namePrefix',
        'nameFirst',
        'nameMiddle',
        'nameLast',
        'nameSuffix',
        'maidenName',
        'displayName',
        'nickname',
        'metDate',
        'metLocation',
      ]) {
        expect(labelFor(id).trim().length).toBeGreaterThan(0);
      }

      const displayName = control('displayName');
      expect(displayName.required).toBe(true);
      expect(displayName).toHaveProperty('placeholder', '');
      expect(labelFor('displayName')).toContain('*');
    });

    it('renders its labels in the active language', async () => {
      await useLanguage('de');
      renderFriendForm();

      expect(labelFor('displayName')).toContain('Anzeigename');
      expect(labelFor('nameFirst')).toContain('Vorname');
    });
  });

  describe('display name', () => {
    it('mirrors the name parts into the display name until it is written by hand', async () => {
      renderFriendForm();
      const display = control('displayName');

      await fireEvent.input(control('nameFirst'), { target: { value: 'Ada' } });
      await tick();
      expect(display.value).toBe('Ada');

      await fireEvent.input(control('nameLast'), { target: { value: 'Lovelace' } });
      await tick();
      expect(display.value).toBe('Ada Lovelace');

      await fireEvent.input(display, { target: { value: 'The Countess' } });
      await fireEvent.input(control('nameLast'), { target: { value: 'Byron' } });
      await tick();
      expect(display.value).toBe('The Countess');

      // Clearing the hand-written name hands control back to the parts.
      await fireEvent.input(display, { target: { value: '' } });
      await fireEvent.input(control('nameLast'), { target: { value: 'King' } });
      await tick();
      expect(display.value).toBe('Ada King');
    });

    it('keeps a saved display name that differs from its name parts', () => {
      renderFriendForm(
        aFriend({ id: 'f1', displayName: 'Ada', nameFirst: 'Augusta', nameLast: 'Lovelace' }),
      );

      expect(control('displayName').value).toBe('Ada');
    });
  });

  describe('photo removal', () => {
    it('asks before removing the photo, which the server deletes immediately', async () => {
      const { deletePhoto } = renderFriendForm(ADA_WITH_PHOTO);

      await fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
      expect(deletePhoto).not.toHaveBeenCalled();

      const dialog = screen.getByRole('dialog');
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }));
      await waitFor(() => expect(deletePhoto).toHaveBeenCalledWith('f1'));
    });

    it('keeps the dialog open with the reason when the delete fails', async () => {
      const { deletePhoto } = renderFriendForm(ADA_WITH_PHOTO);
      deletePhoto.mockRejectedValueOnce(new Error('Storage is read-only'));

      await fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
      const dialog = screen.getByRole('dialog');
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }));

      await waitFor(() =>
        expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain(
          'Storage is read-only',
        ),
      );
    });
  });
});
