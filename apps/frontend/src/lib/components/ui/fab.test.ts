import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fab from '$lib/components/ui/Fab.svelte';
import { fireEvent, render, screen } from '$lib/test/render.js';

function renderIcon() {
  return {
    render() {
      return '<span>+</span>';
    },
  };
}

const ICON = createRawSnippet(renderIcon);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Fab', () => {
  describe('when rendered', () => {
    it('names the button for both screen readers and pointer users', () => {
      render(Fab, { onclick: vi.fn(), label: 'Create new', children: ICON });

      const button = screen.getByRole('button', { name: 'Create new' });
      expect(button.getAttribute('title')).toBe('Create new');
    });
  });

  describe('on tap', () => {
    it('calls onclick on tap', async () => {
      const onclick = vi.fn();
      render(Fab, { onclick, label: 'Create new', children: ICON });

      await fireEvent.click(screen.getByRole('button', { name: 'Create new' }));

      expect(onclick).toHaveBeenCalledTimes(1);
    });
  });
});
