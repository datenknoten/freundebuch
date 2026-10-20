import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test/render.js';
import Fab from './Fab.svelte';

const icon = createRawSnippet(() => ({ render: () => '<span>+</span>' }));

describe('Fab', () => {
  describe('when rendered', () => {
    it('names the button for both screen readers and pointer users', () => {
      render(Fab, { onclick: vi.fn(), label: 'Create new', children: icon });

      const button = screen.getByRole('button', { name: 'Create new' });
      expect(button.getAttribute('title')).toBe('Create new');
    });
  });

  describe('on tap', () => {
    it('calls onclick on tap', async () => {
      const onclick = vi.fn();
      render(Fab, { onclick, label: 'Create new', children: icon });

      await fireEvent.click(screen.getByRole('button', { name: 'Create new' }));

      expect(onclick).toHaveBeenCalledTimes(1);
    });
  });
});
