import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import type { CircleSummaryResponse } from '$shared';
import CircleChips from './CircleChips.svelte';

// i18n echoes keys so the assertions target stable keys, not English text.
vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const circle = (id: string, name: string): CircleSummaryResponse => ({ id, name, color: null });

describe('CircleChips', () => {
  it('renders nothing when there are no circles', () => {
    const { container } = renderWithContext(CircleChips, { props: { circles: [] } });
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders a chip per circle up to maxVisible', () => {
    renderWithContext(CircleChips, {
      props: {
        circles: [circle('1', 'Family'), circle('2', 'Work'), circle('3', 'Gym')],
        maxVisible: 3,
      },
    });

    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Gym')).toBeTruthy();
  });

  it('collapses extra circles behind a "+N more" toggle and expands on click', async () => {
    renderWithContext(CircleChips, {
      props: {
        circles: [circle('1', 'A'), circle('2', 'B'), circle('3', 'C'), circle('4', 'D')],
        maxVisible: 2,
      },
    });

    // Only the first two are shown initially, plus a "+2 more" toggle.
    expect(screen.queryByText('C')).toBeNull();
    const more = screen.getByText('common.showMore');

    await fireEvent.click(more);

    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
    expect(screen.getByText('common.showLess')).toBeTruthy();
  });

  it('invokes onremove with the circle id when a chip is removed', async () => {
    const onremove = vi.fn();
    renderWithContext(CircleChips, {
      props: { circles: [circle('c-1', 'Family')], removable: true, onremove },
    });

    await fireEvent.click(screen.getByLabelText('aria.removeItem'));

    expect(onremove).toHaveBeenCalledWith('c-1');
  });
});
