import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '$lib/test';
import ConfirmDialog from './confirm-dialog.svelte';

vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const base = {
  title: 'Delete email',
  description: 'This removes the address from the friend.',
  itemPreview: 'ada@example.com',
};

describe('ConfirmDialog', () => {
  it('confirms and closes on success', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(ConfirmDialog, { ...base, onConfirm, onClose });

    await fireEvent.click(screen.getByRole('button', { name: /common.delete/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows the reason and stays open when confirming fails', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Address is in use'));
    const onClose = vi.fn();
    render(ConfirmDialog, { ...base, onConfirm, onClose });

    await fireEvent.click(screen.getByRole('button', { name: /common.delete/ }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Address is in use'),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('button', { name: /common.delete/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('uses the given confirm label', () => {
    render(ConfirmDialog, {
      ...base,
      confirmLabel: 'Deactivate',
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });

    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeTruthy();
  });
});
