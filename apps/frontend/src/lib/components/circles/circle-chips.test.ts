import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CircleChips from '$lib/components/circles/CircleChips.svelte';
import { useLanguage } from '$lib/test/locale.js';
import { fireEvent, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import type { CircleSummaryResponse } from '$shared';

function aCircleSummary(id: string, name: string) {
  const summary: CircleSummaryResponse = { id, name, color: null };
  return summary;
}

describe('CircleChips', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when there are no circles', () => {
      const { container } = renderWithContext(CircleChips, { props: { circles: [] } });
      expect(container.textContent?.trim()).toBe('');
    });

    it('renders a chip per circle up to maxVisible', () => {
      renderWithContext(CircleChips, {
        props: {
          circles: [
            aCircleSummary('1', 'Family'),
            aCircleSummary('2', 'Work'),
            aCircleSummary('3', 'Gym'),
          ],
          maxVisible: 3,
        },
      });

      expect(screen.getByText('Family')).toBeTruthy();
      expect(screen.getByText('Work')).toBeTruthy();
      expect(screen.getByText('Gym')).toBeTruthy();
    });
  });

  describe('overflow', () => {
    it('collapses extra circles behind a "+N more" toggle and expands on click', async () => {
      renderWithContext(CircleChips, {
        props: {
          circles: [
            aCircleSummary('1', 'A'),
            aCircleSummary('2', 'B'),
            aCircleSummary('3', 'C'),
            aCircleSummary('4', 'D'),
          ],
          maxVisible: 2,
        },
      });

      expect(screen.queryByText('C')).toBeNull();

      await fireEvent.click(screen.getByText('+2 more'));

      expect(screen.getByText('C')).toBeTruthy();
      expect(screen.getByText('D')).toBeTruthy();
      expect(screen.getByText('Show less')).toBeTruthy();
    });
  });

  describe('removal', () => {
    it('invokes onremove with the circle id when a chip is removed', async () => {
      const onremove = vi.fn();
      renderWithContext(CircleChips, {
        props: { circles: [aCircleSummary('c-1', 'Family')], removable: true, onremove },
      });

      await fireEvent.click(screen.getByLabelText(/^Remove/));

      expect(onremove).toHaveBeenCalledWith('c-1');
    });
  });
});
