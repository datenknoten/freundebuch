import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test';
import CircleEditModal from './circle-edit-modal.svelte';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

describe('CircleEditModal', () => {
  it('renders the form inside an open dialog', () => {
    render(CircleEditModal, { onClose: vi.fn() });

    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(screen.getByLabelText('circles.form.name')).toBeTruthy();
    expect(screen.getByText('circles.form.createCircle')).toBeTruthy();
  });

  it('asks before discarding edits, and Escape answers "keep editing"', async () => {
    const onClose = vi.fn();
    render(CircleEditModal, { onClose });

    const input = screen.getByLabelText('circles.form.name');
    await fireEvent.input(input, { target: { value: 'Family' } });

    // Escape reaches the dialog as the native `cancel` event.
    await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('circles.unsavedChanges.title')).toBeTruthy();

    // A second Escape dismisses the question instead of asking it again.
    await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByText('circles.unsavedChanges.title')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    await fireEvent.click(screen.getByText('circles.unsavedChanges.discard'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
