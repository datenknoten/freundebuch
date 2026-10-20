import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UrlRow from '$lib/components/friends/subresources/UrlRow.svelte';
import en from '$lib/i18n/locales/en.json';
import { aUrl } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { useLanguage } from '$lib/test/locale.js';
import { render, screen } from '$lib/test/render.js';

const strings = en.subresources;

// Renders twice (mobile + desktop), so queries use *All*.
describe('UrlRow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('link', () => {
    it('opens the URL in a new tab with safe rel attributes', () => {
      render(UrlRow, {
        url: aUrl({ url: 'https://example.com/blog', urlType: 'blog' }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      });

      const link = itemAt(screen.getAllByRole('link'), 0);
      expect(link.getAttribute('href')).toBe('https://example.com/blog');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(screen.getAllByText(strings.url.types.blog).length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText(strings.url.editAria).length).toBeGreaterThan(0);
    });

    it('displays the host and path, dropping a bare trailing slash', () => {
      render(UrlRow, {
        url: aUrl({ url: 'https://example.com/' }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      });
      expect(screen.getAllByText('example.com').length).toBeGreaterThan(0);
    });

    it('falls back to the raw value for an unparseable URL', () => {
      render(UrlRow, { url: aUrl({ url: 'not a url' }), onEdit: vi.fn(), onDelete: vi.fn() });
      expect(screen.getAllByText('not a url').length).toBeGreaterThan(0);
    });
  });

  describe('type label', () => {
    it('translates the type label', async () => {
      await useLanguage('de');
      render(UrlRow, {
        url: aUrl({ url: 'https://example.com/', urlType: 'personal' }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      });

      expect(screen.getAllByText('Privat').length).toBeGreaterThan(0);
      expect(screen.queryByText(strings.url.types.personal)).toBeNull();
    });
  });
});
