import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '$lib/test';
import type { NotificationChannel } from '$shared';
import NotificationChannelCard from './notification-channel-card.svelte';

vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const channel = {
  externalId: 'chan-1',
  platform: 'telegram',
  isEnabled: true,
  credentials: { chatId: '4711' },
} as unknown as NotificationChannel;

function renderCard() {
  const ondelete = vi.fn();
  render(NotificationChannelCard, {
    channel,
    ontoggle: vi.fn(),
    onedit: vi.fn(),
    ondelete,
  });
  return ondelete;
}

describe('NotificationChannelCard', () => {
  it('deletes the channel only after the confirmation dialog', async () => {
    const ondelete = renderCard();

    await fireEvent.click(screen.getByText('common.delete'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('profile.messagingReminders.delete.title')).toBeTruthy();
    expect(ondelete).not.toHaveBeenCalled();

    await fireEvent.click(within(dialog).getByText('common.delete'));
    await waitFor(() => expect(ondelete).toHaveBeenCalledWith('chan-1'));
  });

  it('keeps the channel when the dialog is cancelled', async () => {
    const ondelete = renderCard();

    await fireEvent.click(screen.getByText('common.delete'));
    await fireEvent.click(within(screen.getByRole('dialog')).getByText('common.cancel'));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(ondelete).not.toHaveBeenCalled();
  });
});
