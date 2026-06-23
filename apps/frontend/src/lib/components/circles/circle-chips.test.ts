import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test';
import type { CircleSummary } from '$shared';
import CircleChips from './circle-chips.svelte';

const circle = (id: string, name: string): CircleSummary => ({ id, name, color: null });

describe('CircleChips', () => {
  it('renders nothing when there are no circles', () => {
    const { container } = render(CircleChips, { circles: [] });
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders a chip per circle up to maxVisible', () => {
    render(CircleChips, {
      circles: [circle('1', 'Family'), circle('2', 'Work'), circle('3', 'Gym')],
      maxVisible: 3,
    });

    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Gym')).toBeTruthy();
  });

  it('collapses extra circles behind a "+N more" toggle and expands on click', async () => {
    render(CircleChips, {
      circles: [circle('1', 'A'), circle('2', 'B'), circle('3', 'C'), circle('4', 'D')],
      maxVisible: 2,
    });

    // Only the first two are shown initially, plus a "+2 more" toggle.
    expect(screen.queryByText('C')).toBeNull();
    const more = screen.getByText('+2 more');

    await fireEvent.click(more);

    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
    expect(screen.getByText('Show less')).toBeTruthy();
  });

  it('invokes onremove with the circle id when a chip is removed', async () => {
    const onremove = vi.fn();
    render(CircleChips, { circles: [circle('c-1', 'Family')], removable: true, onremove });

    await fireEvent.click(screen.getByLabelText('Remove Family'));

    expect(onremove).toHaveBeenCalledWith('c-1');
  });
});
