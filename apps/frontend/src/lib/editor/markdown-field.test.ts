import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';
import MarkdownField from './markdown-field.svelte';

describe('MarkdownField', () => {
  it('labels the editor content via aria-labelledby', async () => {
    const { container } = render(MarkdownField, {
      props: { value: '', label: 'Notes', hint: '(optional)' },
    });
    await tick();
    const content = container.querySelector('.cm-content');
    const labelId = content?.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    // Quoted attribute selector, not `#id`: $props.id() ids are not
    // guaranteed to be valid CSS identifiers and jsdom has no CSS.escape.
    const label = container.querySelector(`[id="${labelId}"]`);
    expect(label?.textContent).toContain('Notes');
    expect(label?.textContent).toContain('(optional)');
  });

  it('gives two instances distinct label ids', async () => {
    const a = render(MarkdownField, { props: { value: '', label: 'A' } });
    const b = render(MarkdownField, { props: { value: '', label: 'B' } });
    await tick();
    const idA = a.container.querySelector('.cm-content')?.getAttribute('aria-labelledby');
    const idB = b.container.querySelector('.cm-content')?.getAttribute('aria-labelledby');
    expect(idA).not.toBe(idB);
  });
});
