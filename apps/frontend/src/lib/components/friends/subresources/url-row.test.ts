import { describe, expect, it, vi } from 'vitest';
import { aUrl, fireEvent, render, screen } from '$lib/test';
import UrlRow from './url-row.svelte';

// Renders twice (mobile + desktop), so queries use *All*.
describe('UrlRow', () => {
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
    expect(screen.getAllByText('Blog').length).toBeGreaterThan(0);
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
