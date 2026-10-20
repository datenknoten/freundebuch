import { describe, expect, it } from 'vitest';
import FriendAvatar from '$lib/components/friends/FriendAvatar.svelte';
import { render, screen } from '$lib/test/render.js';

describe('FriendAvatar', () => {
  describe('initials', () => {
    it('renders two-letter initials from a single name', () => {
      render(FriendAvatar, { displayName: 'Ada' });
      expect(screen.getByText('AD')).toBeTruthy();
    });

    it('renders first+last initials from a full name', () => {
      render(FriendAvatar, { displayName: 'Ada Lovelace' });
      expect(screen.getByText('AL')).toBeTruthy();
    });
  });

  describe('photo', () => {
    it('renders an image with the name as alt text when a photo is provided', () => {
      render(FriendAvatar, { displayName: 'Ada Lovelace', photoUrl: 'https://example.com/a.jpg' });

      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('https://example.com/a.jpg');
      expect(img.getAttribute('alt')).toBe('Ada Lovelace');
      // The initials fallback is not rendered when a photo exists.
      expect(screen.queryByText('AL')).toBeNull();
    });
  });

  describe('size', () => {
    it('applies the size class for the requested size', () => {
      const { container } = render(FriendAvatar, { displayName: 'Ada', size: 'lg' });
      expect(container.querySelector('.w-24')).toBeTruthy();
    });
  });
});
