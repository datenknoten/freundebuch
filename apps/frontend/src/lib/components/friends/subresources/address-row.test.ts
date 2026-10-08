import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAddress, fireEvent, render, screen, useLanguage, waitFor, within } from '$lib/test';
import AddressRow from './address-row.svelte';

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

describe('AddressRow', () => {
  beforeEach(async () => {
    await useCountryLanguage('en');
  });

  it('shows the English name of a country code', () => {
    render(AddressRow, {
      address: anAddress({ country: 'DE' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByText('Germany').length).toBeGreaterThan(0);
    expect(screen.queryByText('DE')).toBeNull();
  });

  it('shows the German name of a country code', async () => {
    await useCountryLanguage('de');
    render(AddressRow, {
      address: anAddress({ country: 'DE' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByText('Deutschland').length).toBeGreaterThan(0);
    expect(screen.queryByText('Germany')).toBeNull();
  });

  it('shows a legacy free-text country unchanged', async () => {
    await useCountryLanguage('de');
    render(AddressRow, {
      address: anAddress({ country: 'Atlantis' }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(screen.getAllByText('Atlantis').length).toBeGreaterThan(0);
  });

  it('titles the map with the localized address', async () => {
    await useCountryLanguage('de');
    render(AddressRow, {
      address: anAddress({
        streetLine1: 'Hauptstr. 1',
        postalCode: '10115',
        city: 'Berlin',
        country: 'DE',
        latitude: 52.53,
        longitude: 13.38,
      }),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    await fireEvent.click(screen.getAllByText('Karte anzeigen')[0]);

    // The row body renders twice (mobile + desktop), so both copies open the map.
    const dialog = screen.getAllByRole('dialog')[0];
    expect(within(dialog).getByText('Hauptstr. 1, 10115 Berlin, Deutschland')).toBeTruthy();
    // Let Leaflet finish its async mount before cleanup removes the container.
    await waitFor(() => expect(dialog.querySelector('.leaflet-container')).not.toBeNull());
  });
});
