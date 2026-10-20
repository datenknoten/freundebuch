import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DetailEditModal from '$lib/components/friends/subresources/DetailEditModal.svelte';
import { useLanguage } from '$lib/test/locale.js';
import { fireEvent, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';

const UNSAVED_CHANGES = 'You have unsaved changes. Are you sure you want to close?';

function renderBodyHtml() {
  return '<p>body content</p>';
}

function bodySnippet() {
  return { render: renderBodyHtml };
}

const children = createRawSnippet(bodySnippet);

describe('DetailEditModal', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('footer', () => {
    it('wraps content in a <form> by default and saves via submit', async () => {
      const onSave = vi.fn();
      const { container } = renderWithContext(DetailEditModal, {
        props: { title: 'Edit', onSave, onClose: vi.fn(), children },
      });

      expect(container.querySelectorAll('form')).toHaveLength(1);
      await fireEvent.click(screen.getByText('Save'));
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('renders no <form> when asForm is false, and the footer Save still calls onSave', async () => {
      const onSave = vi.fn();
      const { container } = renderWithContext(DetailEditModal, {
        props: { title: 'Edit', asForm: false, onSave, onClose: vi.fn(), children },
      });

      expect(container.querySelectorAll('form')).toHaveLength(0);
      await fireEvent.click(screen.getByText('Save'));
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    // The add-member body renders its own form and submit button; a modal footer
    // would duplicate them.
    it('drops the footer entirely for footer={null}', () => {
      renderWithContext(DetailEditModal, {
        props: { title: 'Add member', asForm: false, footer: null, onClose: vi.fn(), children },
      });

      expect(screen.queryByText('Save')).toBeNull();
      expect(screen.queryByText('Cancel')).toBeNull();
      expect(screen.getByText('body content')).toBeTruthy();
    });
  });

  describe('closing', () => {
    it('asks inside the dialog before discarding, and Escape answers "keep editing"', async () => {
      const onClose = vi.fn();
      renderWithContext(DetailEditModal, {
        props: { title: 'Edit', isDirty: true, onSave: vi.fn(), onClose, children },
      });

      // Escape reaches the dialog as the native `cancel` event.
      await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText(UNSAVED_CHANGES)).toBeTruthy();

      // The body stays mounted behind the question, so the edits survive.
      expect(screen.getByText('body content')).toBeTruthy();

      await fireEvent.click(screen.getByText('Keep Editing'));
      expect(screen.queryByText(UNSAVED_CHANGES)).toBeNull();
      expect(onClose).not.toHaveBeenCalled();

      await fireEvent.click(screen.getByText('Cancel'));
      await fireEvent.click(screen.getByText('Discard Changes'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes straight away when nothing was edited', async () => {
      const onClose = vi.fn();
      renderWithContext(DetailEditModal, {
        props: { title: 'Edit', onSave: vi.fn(), onClose, children },
      });

      await fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(UNSAVED_CHANGES)).toBeNull();
    });
  });
});
