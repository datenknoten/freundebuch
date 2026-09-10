import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '$lib/i18n/locales/en.json';
import { aUrl, render, screen, useLanguage } from '$lib/test';
import UrlRow from './url-row.svelte';

const strings = en.subresources;

// Renders twice (mobile + desktop), so queries use *All*.
describe('UrlRow', () => {
  beforeEach(async () => {
    await useLanguage('en');
  });

  it('opens the URL in a new tab with safe rel attributes', () => {
    render(UrlRow, {
      url: aUrl({ url: 'https://example.com/blog', urlType: 'blog' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    const link = screen.getAllByRole('link')[0];
    expect(link.getAttribute('href')).toBe('https://example.com/blog');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getAllByText(strings.url.types.blog).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(strings.url.editAria).length).toBeGreaterThan(0);
  });

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
