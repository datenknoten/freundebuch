import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLanguage } from '$lib/test/locale.js';
import { fireEvent, screen } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import FacetChips from './FacetChips.svelte';

const context = createTestAppContext();

async function useCountryLanguage(lang: 'en' | 'de') {
  await useLanguage(lang);
  await context.stores.locale.setLanguage(lang);
}

describe('FacetChips', () => {
  beforeEach(async () => {
    await useCountryLanguage('en');
  });

  it('labels a country chip with the country name', () => {
    renderWithContext(FacetChips, {
      context,
      props: { filters: { country: ['DE'] }, onRemove: vi.fn(), onClearAll: vi.fn() },
    });

    expect(screen.getByText('Country: Germany')).toBeTruthy();
  });

  it('labels a country chip in the UI language', async () => {
    await useCountryLanguage('de');
    renderWithContext(FacetChips, {
      context,
      props: { filters: { country: ['DE'] }, onRemove: vi.fn(), onClearAll: vi.fn() },
    });

    expect(screen.getByText('Land: Deutschland')).toBeTruthy();
  });

  it('labels a legacy free-text country unchanged', () => {
    renderWithContext(FacetChips, {
      context,
      props: { filters: { country: ['Atlantis'] }, onRemove: vi.fn(), onClearAll: vi.fn() },
    });

    expect(screen.getByText('Country: Atlantis')).toBeTruthy();
  });

  it('labels other facets with their raw value', () => {
    renderWithContext(FacetChips, {
      context,
      props: { filters: { city: ['DE'] }, onRemove: vi.fn(), onClearAll: vi.fn() },
    });

    expect(screen.getByText('City: DE')).toBeTruthy();
  });

  it('removes a country chip by its code, not its name', async () => {
    const onRemove = vi.fn();
    renderWithContext(FacetChips, {
      context,
      props: { filters: { country: ['DE'] }, onRemove, onClearAll: vi.fn() },
    });

    await fireEvent.click(screen.getByText('Country: Germany'));

    expect(onRemove).toHaveBeenCalledWith('country', 'DE');
  });
});
