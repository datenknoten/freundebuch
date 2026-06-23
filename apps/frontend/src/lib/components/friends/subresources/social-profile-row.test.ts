import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '$lib/test';
import type { SocialProfile } from '$shared';
import SocialProfileRow from './social-profile-row.svelte';

const profile = (overrides: Partial<SocialProfile> = {}): SocialProfile => ({
  id: 'sp-1',
  platform: 'github',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// Renders twice (mobile + desktop), so queries use *All*.
describe('SocialProfileRow', () => {
  it('shows @username and the platform label when a username is set', () => {
    render(SocialProfileRow, {
      profile: profile({ username: 'ada', platform: 'github' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByText('@ada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GitHub').length).toBeGreaterThan(0);
  });

  it('links to the profile URL when there is no username', () => {
    render(SocialProfileRow, {
      profile: profile({ username: undefined, profileUrl: 'https://x.com/ada' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('https://x.com/ada');
  });

  it('falls back to the platform label as plain text when neither is set', () => {
    render(SocialProfileRow, {
      profile: profile({ platform: 'other', username: undefined, profileUrl: undefined }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getAllByText('Other').length).toBeGreaterThan(0);
  });
});
