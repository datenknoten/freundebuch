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
});
