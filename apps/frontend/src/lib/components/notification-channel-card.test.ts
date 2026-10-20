import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationChannelCard from '$lib/components/NotificationChannelCard.svelte';
import { fireEvent, screen, waitFor, within } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import type { NotificationChannelResponse } from '$shared';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/i18n.js', () => import('$lib/test/i18n-key-mock.js'));

const A_TELEGRAM_CHANNEL: NotificationChannelResponse = {
  externalId: 'chan-1',
  platform: 'telegram',
  isEnabled: true,
  lookaheadDays: 7,
  notifyTime: '08:00',
  credentials: { chatId: '4711' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderCard() {
  const ondelete = vi.fn();
  renderWithContext(NotificationChannelCard, {
    props: { channel: A_TELEGRAM_CHANNEL, ontoggle: vi.fn(), onedit: vi.fn(), ondelete },
  });
  return ondelete;
}

describe('NotificationChannelCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deleting', () => {
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
});
