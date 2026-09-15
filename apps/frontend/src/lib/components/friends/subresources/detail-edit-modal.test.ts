import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test';
import DetailEditModal from './detail-edit-modal.svelte';

vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const children = createRawSnippet(() => ({
  render: () => '<p>body content</p>',
}));

describe('DetailEditModal', () => {
  it('wraps content in a <form> by default and saves via submit', async () => {
    const onSave = vi.fn();
    const { container } = render(DetailEditModal, {
      title: 'Edit',
      onSave,
      onClose: vi.fn(),
      children,
    });

    expect(container.querySelectorAll('form')).toHaveLength(1);
    await fireEvent.click(screen.getByText('subresources.common.save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('renders no <form> when asForm is false, and the footer Save still calls onSave', async () => {
    const onSave = vi.fn();
    const { container } = render(DetailEditModal, {
      title: 'Edit',
      asForm: false,
      onSave,
      onClose: vi.fn(),
      children,
    });

    // No surrounding form, so the button is type=button calling onSave directly.
    expect(container.querySelectorAll('form')).toHaveLength(0);
    await fireEvent.click(screen.getByText('subresources.common.save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  // The add-member body renders its own form and submit button; a modal footer
  // would duplicate them.
  it('drops the footer entirely for footer={null}', () => {
    render(DetailEditModal, {
      title: 'Add member',
      asForm: false,
      footer: null,
      onClose: vi.fn(),
      children,
    });

    expect(screen.queryByText('subresources.common.save')).toBeNull();
    expect(screen.queryByText('subresources.common.cancel')).toBeNull();
    expect(screen.getByText('body content')).toBeTruthy();
  });

  it('asks inside the dialog before discarding, and Escape answers "keep editing"', async () => {
    const onClose = vi.fn();
    render(DetailEditModal, { title: 'Edit', isDirty: true, onSave: vi.fn(), onClose, children });

    // Escape reaches the dialog as the native `cancel` event.
    await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('subresources.common.unsavedChanges')).toBeTruthy();

    // The body stays mounted behind the question, so the edits survive.
    expect(screen.getByText('body content')).toBeTruthy();

    await fireEvent.click(screen.getByText('subresources.common.keepEditing'));
    expect(screen.queryByText('subresources.common.unsavedChanges')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByText('subresources.common.cancel'));
    await fireEvent.click(screen.getByText('subresources.common.discardChanges'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes straight away when nothing was edited', async () => {
    const onClose = vi.fn();
    render(DetailEditModal, { title: 'Edit', onSave: vi.fn(), onClose, children });

    await fireEvent.click(screen.getByText('subresources.common.cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('subresources.common.unsavedChanges')).toBeNull();
  });
});
