import { describe, expect, it } from 'vitest';
import { render, screen } from '$lib/test';
import FriendAvatar from './friend-avatar.svelte';

describe('FriendAvatar', () => {
  it('renders two-letter initials from a single name', () => {
    render(FriendAvatar, { displayName: 'Ada' });
    expect(screen.getByText('AD')).toBeTruthy();
  });

  it('renders first+last initials from a full name', () => {
    render(FriendAvatar, { displayName: 'Ada Lovelace' });
    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('renders an image with the name as alt text when a photo is provided', () => {
    render(FriendAvatar, { displayName: 'Ada Lovelace', photoUrl: 'https://example.com/a.jpg' });

    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://example.com/a.jpg');
    expect(img.getAttribute('alt')).toBe('Ada Lovelace');
    // The initials fallback is not rendered when a photo exists.
    expect(screen.queryByText('AL')).toBeNull();
  });

  it('applies the size class for the requested size', () => {
    const { container } = render(FriendAvatar, { displayName: 'Ada', size: 'lg' });
    expect(container.querySelector('.w-24')).toBeTruthy();
  });
});
