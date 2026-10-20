import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TabNav from '$lib/components/TabNav.svelte';
import { fireEvent, render, screen } from '$lib/test/render.js';

const TABS = [
  { id: 'ios', label: 'iOS' },
  { id: 'macos', label: 'macOS' },
  { id: 'thunderbird', label: 'Thunderbird' },
];

describe('TabNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('marks only the active tab as selected', () => {
      render(TabNav, { tabs: TABS, active: 'macos', onselect: vi.fn() });

      expect(screen.getByRole('tab', { name: 'iOS' }).getAttribute('aria-selected')).toBe('false');
      expect(screen.getByRole('tab', { name: 'macOS' }).getAttribute('aria-selected')).toBe('true');
    });

    it('keeps a single tab stop', () => {
      render(TabNav, { tabs: TABS, active: 'macos', onselect: vi.fn() });

      expect(screen.getByRole('tab', { name: 'macOS' }).getAttribute('tabindex')).toBe('0');
      expect(screen.getByRole('tab', { name: 'iOS' }).getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('selecting', () => {
    it('selects a tab on click', async () => {
      const onselect = vi.fn();
      render(TabNav, { tabs: TABS, active: 'ios', onselect });

      await fireEvent.click(screen.getByRole('tab', { name: 'Thunderbird' }));

      expect(onselect).toHaveBeenCalledWith('thunderbird');
    });

    it('moves the selection with the arrow keys and wraps around', async () => {
      const onselect = vi.fn();
      render(TabNav, { tabs: TABS, active: 'ios', onselect });

      await fireEvent.keyDown(screen.getByRole('tab', { name: 'iOS' }), { key: 'ArrowRight' });
      expect(onselect).toHaveBeenLastCalledWith('macos');

      await fireEvent.keyDown(screen.getByRole('tab', { name: 'iOS' }), { key: 'ArrowLeft' });
      expect(onselect).toHaveBeenLastCalledWith('thunderbird');
    });

    it('ignores unrelated keys', async () => {
      const onselect = vi.fn();
      render(TabNav, { tabs: TABS, active: 'ios', onselect });

      await fireEvent.keyDown(screen.getByRole('tab', { name: 'iOS' }), { key: 'a' });

      expect(onselect).not.toHaveBeenCalled();
    });
  });
});
