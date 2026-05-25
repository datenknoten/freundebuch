import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown-view.svelte';

describe('renderMarkdown', () => {
  it('renders markdown headings as HTML', () => {
    expect(renderMarkdown('## Coffee with Anja')).toContain('<h2>Coffee with Anja</h2>');
  });

  it('renders emphasis and lists', () => {
    const html = renderMarkdown('- **bold** item');
    expect(html).toContain('<ul>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('strips a raw <script> payload (XSS regression)', () => {
    const html = renderMarkdown('hi <script>alert("xss")</script>');
    expect(html).not.toContain('<script');
    expect(html.toLowerCase()).not.toContain('alert("xss")</script');
  });

  it('never produces an executable javascript: link', () => {
    // markdown-it refuses to linkify javascript: (leaves inert text); even if
    // it did, DOMPurify would scrub the href. Either way: no live anchor.
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toMatch(/<a[^>]*href=["']?\s*javascript:/i);
  });

  it('hardens external links with target and rel', () => {
    const html = renderMarkdown('[site](https://example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('never renders an <img> (no external requests on view)', () => {
    const html = renderMarkdown('![pixel](https://tracker.example/p.png)');
    expect(html).not.toContain('<img');
  });

  it('handles empty input without throwing', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
