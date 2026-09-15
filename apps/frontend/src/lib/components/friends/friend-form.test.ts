import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  control,
  fireEvent,
  labelFor,
  render,
  screen,
  tick,
  useLanguage,
  waitFor,
  within,
} from '$lib/test';
import FriendForm from './friend-form.svelte';

const deletePhoto = vi.fn().mockResolvedValue(undefined);
vi.mock('$lib/stores/friends', () => ({
  friends: {
    deletePhoto: (...args: unknown[]) => deletePhoto(...args),
  },
}));

describe('FriendForm', () => {
  beforeEach(async () => {
    await useLanguage('en');
  });

  it('gives every field a label and marks display name required outside the placeholder', () => {
    render(FriendForm, {});

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

    const displayName = control('displayName') as HTMLInputElement;
    expect(displayName.required).toBe(true);
    expect(displayName.placeholder).toBe('');
    expect(labelFor('displayName')).toContain('*');
  });

  it('mirrors the name parts into the display name until it is written by hand', async () => {
    render(FriendForm, {});
    const display = control('displayName') as HTMLInputElement;

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
    render(FriendForm, {
      friend: { id: 'f1', displayName: 'Ada', nameFirst: 'Augusta', nameLast: 'Lovelace' } as never,
    });

    expect(control('displayName').value).toBe('Ada');
  });

  it('renders its labels in the active language', async () => {
    await useLanguage('de');
    render(FriendForm, {});

    expect(labelFor('displayName')).toContain('Anzeigename');
    expect(labelFor('nameFirst')).toContain('Vorname');
  });

  it('asks before removing the photo, which the server deletes immediately', async () => {
    render(FriendForm, {
      friend: { id: 'f1', displayName: 'Ada', photoUrl: '/photos/ada.jpg' } as never,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(deletePhoto).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }));
    await waitFor(() => expect(deletePhoto).toHaveBeenCalledWith('f1'));
  });
});
