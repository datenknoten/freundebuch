import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { render, screen } from '$lib/test';
import AlertBanner from './alert-banner.svelte';

const message = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('AlertBanner', () => {
  it('announces errors assertively and marks them with the red edge', () => {
    render(AlertBanner, { variant: 'error', children: message('Could not save') });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Could not save');
    expect(alert.className).toContain('border-l-4');
    expect(alert.className).toContain('border-l-red-500');
  });

  it('announces the other variants politely with their own edge colour', () => {
    render(AlertBanner, { variant: 'success', children: message('Preferences saved') });

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Preferences saved');
    expect(status.className).toContain('border-l-green-500');
  });

  it('renders the optional title above the message', () => {
    render(AlertBanner, {
      variant: 'warning',
      title: 'App password required',
      children: message('Create one first'),
    });

    const status = screen.getByRole('status');
    expect(status.className).toContain('border-l-yellow-500');
    const title = status.querySelector('p');
    expect(title?.textContent).toBe('App password required');
    expect(title?.className).toContain('font-semibold');
  });
});
