import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '$lib/test';
import PasskeyManager from './passkey-manager.svelte';

vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
  getCurrentLanguage: () => 'en',
}));

const deletePasskey = vi.fn();
vi.mock('$lib/auth-client', () => ({
  authClient: {
    passkey: {
      listUserPasskeys: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'pk-1',
            name: 'YubiKey',
            deviceType: 'singleDevice',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      }),
      deletePasskey: (...args: unknown[]) => deletePasskey(...args),
      addPasskey: vi.fn(),
      updatePasskey: vi.fn(),
    },
  },
}));

async function openDeleteConfirmation() {
  render(PasskeyManager);
  await waitFor(() => expect(screen.getByText('YubiKey')).toBeTruthy());
  await fireEvent.click(screen.getByText('common.delete'));
  return screen.getByRole('dialog');
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('PasskeyManager', () => {
  it('deletes a passkey only after the confirmation dialog', async () => {
    deletePasskey.mockResolvedValue({ error: null });
    const dialog = await openDeleteConfirmation();

    expect(within(dialog).getByText('profile.passkeys.deleteTitle')).toBeTruthy();
    expect(within(dialog).getByText('YubiKey')).toBeTruthy();
    expect(deletePasskey).not.toHaveBeenCalled();

    await fireEvent.click(within(dialog).getByText('common.delete'));
    await waitFor(() => expect(deletePasskey).toHaveBeenCalledWith({ id: 'pk-1' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the passkey when the dialog is cancelled', async () => {
    const dialog = await openDeleteConfirmation();

    await fireEvent.click(within(dialog).getByText('common.cancel'));
    expect(deletePasskey).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the dialog open and shows the reason when deletion fails', async () => {
    deletePasskey.mockResolvedValue({ error: { message: 'still in use' } });
    const dialog = await openDeleteConfirmation();

    await fireEvent.click(within(dialog).getByText('common.delete'));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('still in use'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
