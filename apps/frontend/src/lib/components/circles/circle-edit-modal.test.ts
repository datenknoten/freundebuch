import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CircleEditModal from '$lib/components/circles/CircleEditModal.svelte';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { useLanguage } from '$lib/test/locale.js';
import { fireEvent, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';

function getDialog() {
  const dialog = screen.getByRole('dialog');
  if (dialog instanceof HTMLDialogElement) {
    return dialog;
  }
  throw new InvariantError('the dialog role is not a <dialog>');
}

function getForm() {
  const form = getDialog().querySelector('form');
  if (form === null) {
    throw new InvariantError('the dialog holds no <form>');
  }
  return form;
}

function pressEscape() {
  // Escape reaches the dialog as the native `cancel` event.
  return fireEvent(getDialog(), new Event('cancel', { cancelable: true }));
}

describe('CircleEditModal', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('opening', () => {
    it('renders the form inside an open dialog', () => {
      renderWithContext(CircleEditModal, { props: { onClose: vi.fn() } });

      expect(getDialog().open).toBe(true);
      expect(screen.getByLabelText(/^Name/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Create Circle' })).toBeTruthy();
    });
  });

  describe('closing with edits', () => {
    it('asks before discarding edits, and Escape answers "keep editing"', async () => {
      const onClose = vi.fn();
      renderWithContext(CircleEditModal, { props: { onClose } });

      await fireEvent.input(screen.getByLabelText(/^Name/), { target: { value: 'Family' } });

      await pressEscape();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('Unsaved Changes')).toBeTruthy();

      // A second Escape dismisses the question instead of asking it again.
      await pressEscape();
      expect(screen.queryByText('Unsaved Changes')).toBeNull();
      expect(onClose).not.toHaveBeenCalled();

      await pressEscape();
      await fireEvent.click(screen.getByText('Discard Changes'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation', () => {
    it('reports the empty name on the field itself', async () => {
      renderWithContext(CircleEditModal, { props: { onClose: vi.fn() } });

      await fireEvent.submit(getForm());

      const input = screen.getByLabelText(/^Name/);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain('circle-name-error');
      expect(screen.getByText('Circle name is required')).toBeTruthy();
    });
  });
});
