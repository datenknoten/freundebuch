import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test';
import type { DqSuggestionItem, DqSuggestionsResponse } from '$shared';
import DataQualityCard from './data-quality-card.svelte';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const mocks = vi.hoisted(() => ({
  snoozeDqItem: vi.fn(),
  setDqNotApplicable: vi.fn(),
}));

vi.mock('$lib/api/data-quality.js', () => ({
  snoozeDqItem: mocks.snoozeDqItem,
  setDqNotApplicable: mocks.setDqNotApplicable,
}));

function anItem(overrides: Partial<DqSuggestionItem> = {}): DqSuggestionItem {
  return {
    friendId: '11111111-1111-4111-8111-111111111111',
    friendDisplayName: 'Anna Müller',
    fieldKey: 'phone_mobile',
    score: 8,
    gap: 1,
    isStale: false,
    reasons: [],
    ...overrides,
  };
}

function suggestions(count: number): DqSuggestionsResponse {
  return {
    quickWins: Array.from({ length: count }, (_, index) =>
      anItem({
        friendId: `1111111${index}-1111-4111-8111-111111111111`,
        friendDisplayName: `Friend ${index}`,
        score: count - index,
      }),
    ),
    worthwhile: [],
  };
}

describe('DataQualityCard', () => {
  it('renders at most five suggestions', () => {
    render(DataQualityCard, { suggestions: suggestions(12) });

    expect(screen.getAllByText('dataQuality.actions.fill')).toHaveLength(5);
    expect(screen.getByText('Friend 0')).toBeTruthy();
    expect(screen.queryByText('Friend 5')).toBeNull();
  });

  it('links "Ergänzen" to the matching add-form deep link', () => {
    render(DataQualityCard, { suggestions: suggestions(1) });

    const fill = screen.getByText('dataQuality.actions.fill');
    expect(fill.getAttribute('href')).toBe(
      '/friends/11111110-1111-4111-8111-111111111111?add=phone',
    );
  });

  it('links to the plain friend page for a field with no add-form', () => {
    render(DataQualityCard, {
      suggestions: { quickWins: [anItem({ fieldKey: 'photo' })], worthwhile: [] },
    });

    const fill = screen.getByText('dataQuality.actions.fill');
    expect(fill.getAttribute('href')).toBe('/friends/11111111-1111-4111-8111-111111111111');
  });

  it('shows the stale state instead of the missing state for an expired value', () => {
    render(DataQualityCard, {
      suggestions: {
        quickWins: [anItem({ isStale: true, staleDays: 90, gap: 0.5 })],
        worthwhile: [],
      },
    });

    expect(screen.getByText('dataQuality.state.stale')).toBeTruthy();
    expect(screen.queryByText('dataQuality.state.missing')).toBeNull();
  });

  it('switches to the worthwhile bucket', async () => {
    render(DataQualityCard, {
      suggestions: {
        quickWins: [anItem({ friendDisplayName: 'Quick Friend' })],
        worthwhile: [
          {
            friendId: '22222222-2222-4222-8222-222222222222',
            friendDisplayName: 'Worthwhile Friend',
            score: 12,
            items: [
              anItem({
                friendId: '22222222-2222-4222-8222-222222222222',
                friendDisplayName: 'Worthwhile Friend',
                fieldKey: 'birthday',
              }),
            ],
          },
        ],
      },
    });

    expect(screen.getByText('Quick Friend')).toBeTruthy();

    await fireEvent.click(screen.getByText('dataQuality.tabs.worthwhile'));

    expect(screen.getByText('Worthwhile Friend')).toBeTruthy();
    expect(screen.queryByText('Quick Friend')).toBeNull();
  });

  it('snoozes an item and notifies the parent', async () => {
    mocks.snoozeDqItem.mockResolvedValue({ snoozedUntil: '2026-09-08', laterCount: 1 });
    const onChanged = vi.fn();
    render(DataQualityCard, { suggestions: suggestions(1), onChanged });

    await fireEvent.click(screen.getByText('dataQuality.actions.later'));

    expect(mocks.snoozeDqItem).toHaveBeenCalledWith({
      friendId: '11111110-1111-4111-8111-111111111111',
      fieldKey: 'phone_mobile',
      days: 30,
      reason: 'later',
    });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('keeps the list rendered when an action fails', async () => {
    mocks.snoozeDqItem.mockRejectedValue(new Error('nope'));
    render(DataQualityCard, { suggestions: suggestions(1) });

    await fireEvent.click(screen.getByText('dataQuality.actions.later'));

    expect(screen.getByText('dataQuality.actionFailed')).toBeTruthy();
    expect(screen.getByText('Friend 0')).toBeTruthy();
  });

  it('shows the empty state when nothing is suggested', () => {
    render(DataQualityCard, { suggestions: { quickWins: [], worthwhile: [] } });

    expect(screen.getByText('dataQuality.empty')).toBeTruthy();
  });
});
