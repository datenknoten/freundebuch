import { describe, expect, it, vi } from 'vitest';
import { aFriendDate, fireEvent, render, screen, withDefaultLocale } from '$lib/test';
import DateRow from './date-row.svelte';

// The component formats via `toLocaleDateString(undefined, …)`, so its output
// depends on the runtime's default locale. Assertions therefore either stick to
// locale-independent facts (is the year there or not?) or pin the default with
// `withDefaultLocale`. Never assert a bare English month name: that passes in
// CI and fails on a de_DE machine, which is what this file used to do.
//
// Renders twice (mobile + desktop), so queries use *All*.
describe('DateRow', () => {
  const props = { onEdit: vi.fn(), onDelete: vi.fn() };

  describe('year visibility', () => {
    it('shows the year when it is known', () => {
      render(DateRow, {
        ...props,
        date: aFriendDate({ dateValue: '1990-05-15', yearKnown: true, dateType: 'birthday' }),
      });

      expect(screen.getAllByText(/1990/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Birthday').length).toBeGreaterThan(0);
    });

    it('omits the year when it is unknown', () => {
      render(DateRow, {
        ...props,
        date: aFriendDate({ dateValue: '1990-05-15', yearKnown: false }),
      });

      expect(screen.queryByText(/1990/)).toBeNull();
    });
  });

  describe('locale formatting', () => {
    // Full rendered strings, so a wrong option (numeric instead of long month,
    // say) fails rather than slipping past a loose regex.
    it.each([
      { locale: 'en-US', withYear: 'May 15, 1990', withoutYear: 'May 15' },
      { locale: 'de-DE', withYear: '15. Mai 1990', withoutYear: '15. Mai' },
      { locale: 'ja-JP', withYear: '1990年5月15日', withoutYear: '5月15日' },
    ])('renders $locale dates', ({ locale, withYear, withoutYear }) => {
      const { unmount } = withDefaultLocale(locale, () =>
        render(DateRow, {
          ...props,
          date: aFriendDate({ dateValue: '1990-05-15', yearKnown: true }),
        }),
      );

      expect(screen.getAllByText(withYear).length).toBeGreaterThan(0);
      unmount();

      withDefaultLocale(locale, () =>
        render(DateRow, {
          ...props,
          date: aFriendDate({ dateValue: '1990-05-15', yearKnown: false }),
        }),
      );

      expect(screen.getAllByText(withoutYear).length).toBeGreaterThan(0);
    });

    it('renders the UTC calendar day regardless of the host timezone', () => {
      // `new Date('1990-05-15')` is UTC midnight. Without a pinned TZ this
      // renders as the 14th anywhere behind UTC.
      withDefaultLocale('en-US', () =>
        render(DateRow, {
          ...props,
          date: aFriendDate({ dateValue: '1990-05-15', yearKnown: true }),
        }),
      );

      expect(screen.getAllByText('May 15, 1990').length).toBeGreaterThan(0);
    });
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
