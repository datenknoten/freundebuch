import type { ComponentProps } from 'svelte';
import { get } from 'svelte/store';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { filterModeCategory, filterModePrefix, isFilterModeActive } from '$lib/stores/ui';
import { fireEvent, render, screen, tick, useLanguage, waitFor, within } from '$lib/test';
import type { FacetGroups } from '$shared';
import FacetDropdown from './facet-dropdown.svelte';

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

function someFacets(overrides: Partial<FacetGroups> = {}): FacetGroups {
  return {
    location: [
      {
        field: 'country',
        label: 'Country',
        values: [
          { value: 'DE', count: 3 },
          { value: 'Atlantis', count: 1 },
        ],
      },
      { field: 'city', label: 'City', values: [{ value: 'DE', count: 2 }] },
    ],
    professional: [
      { field: 'organization', label: 'Organization', values: [{ value: 'ACME', count: 2 }] },
      { field: 'job_title', label: 'Job Title', values: [{ value: 'Engineer', count: 1 }] },
      { field: 'department', label: 'Department', values: [{ value: 'R&D', count: 1 }] },
    ],
    relationship: [
      {
        field: 'relationship_category',
        label: 'Relationship',
        values: [{ value: 'family', count: 4 }],
      },
    ],
    circles: [
      { value: 'circle-1', label: 'Climbing', color: '#00ff00', count: 2 },
      { value: 'circle-empty', label: 'Empty Circle', color: '#0000ff', count: 0 },
    ],
    ...overrides,
  };
}

const NO_FACETS: FacetGroups = { location: [], professional: [], relationship: [], circles: [] };

function renderDropdown(props: Partial<ComponentProps<typeof FacetDropdown>> = {}) {
  const onFilterChange = vi.fn();
  const view = render(FacetDropdown, {
    facets: someFacets(),
    activeFilters: {},
    onFilterChange,
    ...props,
  });
  return { onFilterChange, component: view.component };
}

async function openDropdown() {
  // "Filters" in English, "Filter" in German.
  await fireEvent.click(screen.getByRole('button', { name: /^Filter/ }));
}

async function enterFilterMode(category: string) {
  isFilterModeActive.set(true);
  filterModeCategory.set(category);
  filterModePrefix.set('f');
  await tick();
}

const scrollIntoView = vi.fn();

describe('FacetDropdown', () => {
  beforeAll(() => {
    // jsdom has no layout, so it ships no scrollIntoView.
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterAll(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  beforeEach(async () => {
    await useCountryLanguage('en');
  });

  afterEach(() => {
    isFilterModeActive.set(false);
    filterModeCategory.set(null);
    filterModePrefix.set(null);
    scrollIntoView.mockClear();
  });

  describe('dropdown', () => {
    it('lists country facets by name', async () => {
      renderDropdown();
      await openDropdown();

      expect(screen.getByRole('checkbox', { name: /Germany/ })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: /Atlantis/ })).toBeTruthy();
    });

    it('lists country facets in the UI language', async () => {
      await useCountryLanguage('de');
      renderDropdown();
      await openDropdown();

      expect(screen.getByRole('checkbox', { name: /Deutschland/ })).toBeTruthy();
    });

    it('lists other facets by their raw value', async () => {
      renderDropdown();
      await openDropdown();
      const location = within(screen.getByText('City').parentElement as HTMLElement);

      expect(location.getByRole('checkbox', { name: /DE/ })).toBeTruthy();
      expect(location.queryByText('Germany')).toBeNull();
      expect(screen.getByRole('checkbox', { name: /ACME/ })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: /family/ })).toBeTruthy();
    });

    it('filters a country by its code', async () => {
      const { onFilterChange } = renderDropdown();
      await openDropdown();

      await fireEvent.click(screen.getByRole('checkbox', { name: /Germany/ }));

      expect(onFilterChange).toHaveBeenCalledWith({ country: ['DE'] });
    });

    it('adds a value to the filters already active', async () => {
      const { onFilterChange } = renderDropdown({
        activeFilters: { country: ['DE'], favorites: true },
      });
      await openDropdown();

      await fireEvent.click(screen.getByRole('checkbox', { name: /Atlantis/ }));

      expect(onFilterChange).toHaveBeenCalledWith({ country: ['DE', 'Atlantis'], favorites: true });
    });

    it('removes an active value and drops the field once empty', async () => {
      const { onFilterChange } = renderDropdown({ activeFilters: { country: ['DE'] } });
      await openDropdown();
      const germany = screen.getByRole('checkbox', { name: /Germany/ }) as HTMLInputElement;
      expect(germany.checked).toBe(true);

      await fireEvent.click(germany);

      expect(onFilterChange).toHaveBeenCalledWith({ country: undefined });
    });

    it('toggles professional, relationship and circle facets', async () => {
      const { onFilterChange } = renderDropdown();
      await openDropdown();

      await fireEvent.click(screen.getByRole('checkbox', { name: /ACME/ }));
      await fireEvent.click(screen.getByRole('checkbox', { name: /family/ }));
      await fireEvent.click(screen.getByRole('checkbox', { name: /No Circle/ }));
      await fireEvent.click(screen.getByRole('checkbox', { name: /Climbing/ }));

      expect(onFilterChange.mock.calls).toEqual([
        [{ organization: ['ACME'] }],
        [{ relationship_category: ['family'] }],
        [{ circles: ['no-circle'] }],
        [{ circles: ['circle-1'] }],
      ]);
    });

    it('hides circles without members', async () => {
      renderDropdown();
      await openDropdown();

      expect(screen.queryByText('Empty Circle')).toBeNull();
    });

    it('shows only the sections that have facets', async () => {
      renderDropdown({
        facets: someFacets({ location: [], professional: [], relationship: [] }),
      });
      await openDropdown();

      expect(screen.queryByText('Location')).toBeNull();
      expect(screen.queryByText('Professional')).toBeNull();
      expect(screen.queryByText('Relationship')).toBeNull();
      expect(screen.getByRole('checkbox', { name: /Climbing/ })).toBeTruthy();
    });

    it('opens nothing when there are no facets', async () => {
      renderDropdown({ facets: NO_FACETS });
      await openDropdown();

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('closes when the button is clicked again', async () => {
      renderDropdown();
      await openDropdown();
      await openDropdown();

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('closes on Escape', async () => {
      renderDropdown();
      await openDropdown();

      await fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('ignores other keys', async () => {
      renderDropdown();
      await openDropdown();

      await fireEvent.keyDown(window, { key: 'Enter' });

      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    });

    it('closes on a click outside but not on a click inside', async () => {
      renderDropdown();
      await openDropdown();

      await fireEvent.click(screen.getByText('Location'));
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);

      await fireEvent.click(document.body);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });

  describe('button', () => {
    it('counts the active list filters', () => {
      renderDropdown({
        activeFilters: { country: ['DE', 'AT'], circles: ['circle-1'], favorites: true },
      });

      expect(screen.getByRole('button', { name: /Filters/ }).textContent).toContain('3');
    });

    it('shows no count without active filters', () => {
      renderDropdown({ activeFilters: { favorites: true } });

      expect(screen.getByRole('button', { name: /Filters/ }).textContent?.trim()).toBe('Filters');
    });

    it('is busy while the first facets load', () => {
      renderDropdown({ facets: null, isLoading: true });

      expect(screen.getByRole('button', { name: /Filters/ }).getAttribute('aria-busy')).toBe(
        'true',
      );
    });

    it('stays usable while facets refresh', () => {
      renderDropdown({ isLoading: true });

      expect(screen.getByRole('button', { name: /Filters/ }).getAttribute('aria-busy')).toBeNull();
    });
  });

  describe('keyboard filter mode', () => {
    it('lists country facets by name with keyboard hints', async () => {
      renderDropdown();
      await enterFilterMode('country');
      const dialog = within(screen.getByRole('dialog'));

      const germany = dialog.getByRole('checkbox', { name: /Germany/ });
      expect(germany.closest('label')?.querySelector('kbd')?.textContent).toBe('1');
      expect(dialog.getByRole('checkbox', { name: /Atlantis/ })).toBeTruthy();
    });

    it('lists country facets in the UI language', async () => {
      await useCountryLanguage('de');
      renderDropdown();
      await enterFilterMode('country');

      expect(
        within(screen.getByRole('dialog')).getByRole('checkbox', { name: /Deutschland/ }),
      ).toBeTruthy();
    });

    it('lists other facets by their raw value', async () => {
      renderDropdown();
      await enterFilterMode('city');
      const dialog = within(screen.getByRole('dialog'));

      expect(dialog.getByRole('checkbox', { name: /^1 DE/ })).toBeTruthy();
      expect(dialog.getByRole('checkbox', { name: /ACME/ })).toBeTruthy();
      expect(dialog.getByRole('checkbox', { name: /family/ })).toBeTruthy();
      expect(dialog.getByRole('checkbox', { name: /Climbing/ })).toBeTruthy();
    });

    it('filters a country by its code from the list', async () => {
      const { onFilterChange } = renderDropdown();
      await enterFilterMode('country');

      await fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('checkbox', { name: /Germany/ }),
      );

      expect(onFilterChange).toHaveBeenCalledWith({ country: ['DE'] });
    });

    it('toggles every section from the list', async () => {
      const { onFilterChange } = renderDropdown();
      await enterFilterMode('organization');
      const dialog = within(screen.getByRole('dialog'));

      await fireEvent.click(dialog.getByRole('checkbox', { name: /ACME/ }));
      await fireEvent.click(dialog.getByRole('checkbox', { name: /family/ }));
      await fireEvent.click(dialog.getByRole('checkbox', { name: /No Circle/ }));
      await fireEvent.click(dialog.getByRole('checkbox', { name: /Climbing/ }));

      expect(onFilterChange.mock.calls).toEqual([
        [{ organization: ['ACME'] }],
        [{ relationship_category: ['family'] }],
        [{ circles: ['no-circle'] }],
        [{ circles: ['circle-1'] }],
      ]);
    });

    it.each([
      ['country', { country: ['DE'] }],
      ['city', { city: ['DE'] }],
      ['organization', { organization: ['ACME'] }],
      ['job_title', { job_title: ['Engineer'] }],
      ['department', { department: ['R&D'] }],
      ['relationship_category', { relationship_category: ['family'] }],
      ['circles', { circles: ['no-circle'] }],
    ])('selects the first %s value by keyboard index', async (category, expected) => {
      const { onFilterChange, component } = renderDropdown();
      await enterFilterMode(category);

      component.toggleFilterByIndex(0);

      expect(onFilterChange).toHaveBeenCalledWith(expected);
    });

    it('selects a circle after the "No Circle" entry', async () => {
      const { onFilterChange, component } = renderDropdown();
      await enterFilterMode('circles');

      component.toggleFilterByIndex(1);

      expect(onFilterChange).toHaveBeenCalledWith({ circles: ['circle-1'] });
    });

    it.each([
      ['country', -1],
      ['country', 2],
      ['unknown', 0],
    ])('ignores %s index %i when it has no value', async (category, index) => {
      const { onFilterChange, component } = renderDropdown();
      await enterFilterMode(category);

      component.toggleFilterByIndex(index);

      expect(onFilterChange).not.toHaveBeenCalled();
    });

    it('ignores keyboard indexes for a group the facets lack', async () => {
      const { onFilterChange, component } = renderDropdown({
        facets: someFacets({ location: [], professional: [], relationship: [] }),
      });
      await enterFilterMode('country');

      component.toggleFilterByIndex(0);
      for (const category of [
        'city',
        'organization',
        'job_title',
        'department',
        'relationship_category',
      ]) {
        filterModeCategory.set(category);
        await tick();
        component.toggleFilterByIndex(0);
      }

      expect(onFilterChange).not.toHaveBeenCalled();
    });

    it.each([
      ['country', 'Location'],
      ['city', 'Location'],
      ['organization', 'Professional'],
      ['job_title', 'Professional'],
      ['department', 'Professional'],
      ['relationship_category', 'Relationship'],
      ['circles', 'Circles'],
    ])('scrolls the %s category into view', async (category, section) => {
      renderDropdown();
      await enterFilterMode(category);
      const heading = within(screen.getByRole('dialog')).getByRole('heading', { name: section });

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
      expect(scrollIntoView.mock.contexts[0]).toBe(heading.parentElement);
    });

    it('does not scroll for an unknown category', async () => {
      renderDropdown();
      await enterFilterMode('unknown');
      await tick();

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('shows no list without facets', async () => {
      renderDropdown({ facets: NO_FACETS });
      await enterFilterMode('country');

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('replaces the open dropdown', async () => {
      renderDropdown();
      await openDropdown();
      await enterFilterMode('country');

      expect(screen.getAllByRole('checkbox', { name: /Germany/ })).toHaveLength(1);
    });

    it('leaves Escape to the modal and keeps the dropdown for afterwards', async () => {
      renderDropdown();
      await openDropdown();
      await enterFilterMode('country');

      await fireEvent.keyDown(window, { key: 'Escape' });
      isFilterModeActive.set(false);
      await tick();

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('checkbox', { name: /Germany/ })).toBeTruthy();
    });

    it('ends keyboard filter mode when closed', async () => {
      renderDropdown();
      await enterFilterMode('country');

      await fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }),
      );

      expect(screen.queryByRole('dialog')).toBeNull();
      expect([get(isFilterModeActive), get(filterModeCategory), get(filterModePrefix)]).toEqual([
        false,
        null,
        null,
      ]);
    });
  });
});
