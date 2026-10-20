import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationChannelForm from '$lib/components/NotificationChannelForm.svelte';
import { useLanguage } from '$lib/test/locale.js';
import { control, labelFor, render } from '$lib/test/render.js';
import type { NotificationChannelResponse } from '$shared';

const A_MATRIX_CHANNEL: NotificationChannelResponse = {
  externalId: 'ch1',
  platform: 'matrix',
  isEnabled: true,
  lookaheadDays: 7,
  notifyTime: '08:00',
  credentials: { homeserver: 'https://matrix.example.com', roomId: '!r:example.com' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('NotificationChannelForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('edit mode', () => {
    it('shows the platform of an existing channel as a disabled input', () => {
      render(NotificationChannelForm, {
        channel: A_MATRIX_CHANNEL,
        onsubmit: vi.fn(),
        oncancel: vi.fn(),
      });

      const platform = control('platform');
      expect(platform).toBeInstanceOf(HTMLInputElement);
      expect(platform.disabled).toBe(true);
      expect(platform.value).toBe('Matrix');
      expect(labelFor('platform')).toContain('Platform');
    });
  });
});
