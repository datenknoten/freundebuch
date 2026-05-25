import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';
import MarkdownEditor from './markdown-editor.svelte';

// CM6 mounts a real DOM, so these run under jsdom. We assert on the editor's
// text content (the raw markdown is always present as DOM text — that's the
// whole point of inline live-preview) rather than reaching into private view
// internals.
describe('MarkdownEditor', () => {
  it('renders a heading line with the inline-preview decoration', async () => {
    const { container } = render(MarkdownEditor, { props: { value: '## Hello' } });
    await tick();
    // Inline live-preview keeps the raw `## ` in the document but hides the
    // marker in the DOM and tags the line as a heading. So we assert on the
    // decoration class + visible text, not the raw markers.
    const heading = container.querySelector('.cm-atomic-h2');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain('Hello');
  });

  it('reconciles an external value change into the document', async () => {
    const { container, rerender } = render(MarkdownEditor, { props: { value: 'first' } });
    await tick();
    await rerender({ value: 'second' });
    await tick();
    const content = container.querySelector('.cm-content');
    expect(content?.textContent).toContain('second');
    expect(content?.textContent).not.toContain('first');
  });

  it('mounts without a placeholder and stays empty', async () => {
    const { container } = render(MarkdownEditor, { props: { value: '' } });
    await tick();
    const content = container.querySelector('.cm-content');
    expect(content?.textContent).toBe('');
  });
});
