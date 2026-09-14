import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test';
import Button from './button.svelte';

// i18n returns the key so the spinner's sr-only label is stable.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const label = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Button', () => {
  it('renders an anchor when href is given', () => {
    render(Button, { href: '/friends/new', children: label('Add friend') });

    const link = screen.getByRole('link', { name: 'Add friend' });
    expect(link.getAttribute('href')).toBe('/friends/new');
  });

  // aria-busy is the announcement; the spinner must not join the accessible
  // name or announce a second time through its own status role.
  it('disables and announces loading without renaming itself', () => {
    render(Button, { loading: true, children: label('Save') });

    const button = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not fire onclick while loading', async () => {
    const onclick = vi.fn();
    render(Button, { loading: true, onclick, children: label('Save') });

    await fireEvent.click(screen.getByRole('button'));

    expect(onclick).not.toHaveBeenCalled();
  });

  it('passes data attributes through to the element', () => {
    render(Button, {
      'data-shortcut': 'n f',
      children: label('New'),
    });

    expect(screen.getByRole('button').getAttribute('data-shortcut')).toBe('n f');
  });
});
