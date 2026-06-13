import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGetUpcomingDatesResult } from '../models/queries/friend-dates.queries.js';
import { formatNotificationMessage } from './notification-messages.js';

function makeDate(overrides: Partial<IGetUpcomingDatesResult>): IGetUpcomingDatesResult {
  return {
    date_external_id: 'date-1',
    date_type: 'birthday',
    date_value: new Date(1990, 5, 20), // 1990-06-20
    days_until: 7,
    friend_display_name: 'Anna Bauer',
    friend_external_id: 'friend-1',
    friend_photo_thumbnail_url: null,
    label: null,
    year_known: true,
    ...overrides,
  };
}

describe('formatNotificationMessage age handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fixed "today" so age math is deterministic
    vi.setSystemTime(new Date(2026, 5, 13)); // 2026-06-13
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes the age the friend turns for a known-year birthday (en)', () => {
    const { plain, html } = formatNotificationMessage(
      [makeDate({ date_value: new Date(1990, 5, 20), days_until: 7 })],
      'en',
    );
    // 2026 occurrence - 1990 birth year = 36
    expect(plain).toContain("Anna Bauer's birthday (June 20, turns 36)");
    expect(html).toContain('turns 36');
  });

  it('includes the age for a known-year birthday (de)', () => {
    const { plain } = formatNotificationMessage(
      [makeDate({ date_value: new Date(1990, 5, 20), days_until: 7 })],
      'de',
    );
    expect(plain).toContain('Geburtstag (20. Juni, wird 36)');
  });

  it('uses the upcoming-occurrence year across a year boundary', () => {
    vi.setSystemTime(new Date(2026, 11, 28)); // 2026-12-28
    const { plain } = formatNotificationMessage(
      [
        makeDate({
          date_value: new Date(1990, 0, 2), // Jan 2 1990
          days_until: 5, // -> 2027-01-02
        }),
      ],
      'en',
    );
    // 2027 occurrence - 1990 = 37
    expect(plain).toContain('turns 37');
  });

  it('omits the age when the year is not known', () => {
    const { plain } = formatNotificationMessage([makeDate({ year_known: false })], 'en');
    expect(plain).toContain("Anna Bauer's birthday (June 20)");
    expect(plain).not.toContain('turns');
  });

  it('shows a year count for known-year anniversaries instead of "turns"', () => {
    const { plain } = formatNotificationMessage(
      [
        makeDate({
          date_type: 'anniversary',
          date_value: new Date(2016, 5, 20),
          days_until: 7,
        }),
      ],
      'en',
    );
    // 2026 - 2016 = 10
    expect(plain).toContain('wedding anniversary (June 20, 10 years)');
    expect(plain).not.toContain('turns');
  });

  it('shows a year count for known-year anniversaries (de)', () => {
    const { plain } = formatNotificationMessage(
      [
        makeDate({
          date_type: 'anniversary',
          date_value: new Date(2016, 5, 20),
          days_until: 7,
        }),
      ],
      'de',
    );
    expect(plain).toContain('Hochzeitstag (20. Juni, 10 Jahre)');
  });

  it('uses the year count for known-year "other" dates with a label', () => {
    const { plain } = formatNotificationMessage(
      [
        makeDate({
          date_type: 'other',
          label: 'Gotcha day',
          date_value: new Date(2020, 5, 20),
          days_until: 7,
        }),
      ],
      'en',
    );
    expect(plain).toContain('Gotcha day (June 20, 6 years)');
  });

  it('uses singular year wording for a one-year count (en/de)', () => {
    const date = makeDate({
      date_type: 'anniversary',
      date_value: new Date(2025, 5, 20),
      days_until: 7,
    });
    // 2026 - 2025 = 1
    expect(formatNotificationMessage([date], 'en').plain).toContain('June 20, 1 year)');
    expect(formatNotificationMessage([date], 'de').plain).toContain('20. Juni, 1 Jahr)');
  });

  it('escapes user-controlled values in the HTML body to prevent injection', () => {
    const { plain, html } = formatNotificationMessage(
      [
        makeDate({
          date_type: 'other',
          friend_display_name: '<b>Mallory</b> & "friends"',
          label: '<img src=x onerror=alert(1)>',
          year_known: false,
        }),
      ],
      'en',
      'https://example.com/?a=1&b=2',
    );
    // HTML body must not contain the raw injected markup
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>Mallory</b> &');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;b&gt;Mallory&lt;/b&gt; &amp; &quot;friends&quot;');
    expect(html).toContain('https://example.com/?a=1&amp;b=2');
    // Plain text stays unescaped
    expect(plain).toContain('<b>Mallory</b> & "friends"');
  });

  it('displays the normalized occurrence date for Feb 29 in a non-leap year', () => {
    vi.setSystemTime(new Date(2026, 1, 20)); // 2026-02-20, non-leap year
    const { plain } = formatNotificationMessage(
      [
        makeDate({
          date_value: new Date(2000, 1, 29), // Feb 29 2000
          days_until: 8, // -> 2026-02-28 (SQL normalizes Feb 29 to Feb 28)
        }),
      ],
      'en',
    );
    // Shows the actual upcoming occurrence (Feb 28), not the stored Feb 29
    expect(plain).toContain("Anna Bauer's birthday (February 28, turns 26)");
    expect(plain).not.toContain('February 29');
  });
});
