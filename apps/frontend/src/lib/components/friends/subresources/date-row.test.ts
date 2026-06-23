import { describe, expect, it, vi } from 'vitest';
import { aFriendDate, fireEvent, render, screen } from '$lib/test';
import DateRow from './date-row.svelte';

// Renders twice (mobile + desktop), so queries use *All*.
describe('DateRow', () => {
  it('formats a date with its year when the year is known', () => {
    render(DateRow, {
      date: aFriendDate({ dateValue: '1990-05-15', yearKnown: true, dateType: 'birthday' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    // Locale/timezone-stable assertions: month name present, year shown.
    expect(screen.getAllByText(/May/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1990/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Birthday').length).toBeGreaterThan(0);
  });

  it('omits the year when it is unknown', () => {
    render(DateRow, {
      date: aFriendDate({ dateValue: '1990-05-15', yearKnown: false }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByText(/May/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1990/)).toBeNull();
  });

  it('invokes onEdit and onDelete from the row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(DateRow, { date: aFriendDate(), onEdit, onDelete });

    await fireEvent.click(screen.getAllByLabelText('Edit date')[0]);
    await fireEvent.click(screen.getAllByLabelText('Delete date')[0]);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
