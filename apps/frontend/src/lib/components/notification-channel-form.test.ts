import { beforeAll, describe, expect, it } from 'vitest';
import { control, labelFor, render, useLanguage } from '$lib/test';
import NotificationChannelForm from './notification-channel-form.svelte';

describe('NotificationChannelForm', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('shows the platform of an existing channel as a disabled input', () => {
    render(NotificationChannelForm, {
      channel: {
        id: 'ch1',
        platform: 'matrix',
        isEnabled: true,
        lookaheadDays: 7,
        notifyTime: '08:00',
        credentials: { homeserver: 'https://matrix.example.com', roomId: '!r:example.com' },
      } as never,
      onsubmit: () => undefined,
      oncancel: () => undefined,
    });

    const platform = control('platform') as HTMLInputElement;
    expect(platform.tagName).toBe('INPUT');
    expect(platform.disabled).toBe(true);
    expect(platform.value).toBe('Matrix');
    expect(labelFor('platform')).toContain('Platform');
  });
});
