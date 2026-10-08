import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, useLanguage } from '$lib/test';
import FacetChips from './facet-chips.svelte';

// Hoisted above the mock factory so the test body and the mocked module share
// the same store. Hand-rolled rather than `writable`, because `vi.hoisted`
// runs before this file's imports.
const language = vi.hoisted(() => {
  let value = 'en';
  const subscribers = new Set<(v: string) => void>();
  return {
    subscribe(run: (v: string) => void) {
      subscribers.add(run);
      run(value);
      return () => {
        subscribers.delete(run);
      };
    },
    set(next: string) {
      value = next;
      for (const run of subscribers) run(value);
    },
  };
});

vi.mock('$lib/stores/locale', () => ({ currentLanguage: language }));

async function useCountryLanguage(lang: 'en' | 'de') {
  await useLanguage(lang);
  language.set(lang);
}

describe('FacetChips', () => {
  beforeEach(async () => {
    await useCountryLanguage('en');
  });

  it('labels a country chip with the country name', () => {
    render(FacetChips, { filters: { country: ['DE'] }, onRemove: vi.fn(), onClearAll: vi.fn() });

    expect(screen.getByText('Country: Germany')).toBeTruthy();
  });

  it('labels a country chip in the UI language', async () => {
    await useCountryLanguage('de');
    render(FacetChips, { filters: { country: ['DE'] }, onRemove: vi.fn(), onClearAll: vi.fn() });

    expect(screen.getByText('Land: Deutschland')).toBeTruthy();
  });

  it('labels a legacy free-text country unchanged', () => {
    render(FacetChips, {
      filters: { country: ['Atlantis'] },
      onRemove: vi.fn(),
      onClearAll: vi.fn(),
    });

    expect(screen.getByText('Country: Atlantis')).toBeTruthy();
  });

  it('labels other facets with their raw value', () => {
    render(FacetChips, { filters: { city: ['DE'] }, onRemove: vi.fn(), onClearAll: vi.fn() });

    expect(screen.getByText('City: DE')).toBeTruthy();
  });

  it('removes a country chip by its code, not its name', async () => {
    const onRemove = vi.fn();
    render(FacetChips, { filters: { country: ['DE'] }, onRemove, onClearAll: vi.fn() });

    await fireEvent.click(screen.getByText('Country: Germany'));

    expect(onRemove).toHaveBeenCalledWith('country', 'DE');
  });
});
