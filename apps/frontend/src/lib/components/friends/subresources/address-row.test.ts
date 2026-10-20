import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anAddress } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { useLanguage } from '$lib/test/locale.js';
import { fireEvent, screen, waitFor, within } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import AddressRow from './AddressRow.svelte';

const context = createTestAppContext();

async function useCountryLanguage(lang: 'en' | 'de') {
  await useLanguage(lang);
  await context.stores.locale.setLanguage(lang);
}

describe('AddressRow', () => {
  beforeEach(async () => {
    await useCountryLanguage('en');
  });

  it('shows the English name of a country code', () => {
    renderWithContext(AddressRow, {
      context,
      props: {
        address: anAddress({ country: 'DE' }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      },
    });

    expect(screen.getAllByText('Germany').length).toBeGreaterThan(0);
    expect(screen.queryByText('DE')).toBeNull();
  });

  it('shows the German name of a country code', async () => {
    await useCountryLanguage('de');
    renderWithContext(AddressRow, {
      context,
      props: {
        address: anAddress({ country: 'DE' }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      },
    });

    expect(screen.getAllByText('Deutschland').length).toBeGreaterThan(0);
    expect(screen.queryByText('Germany')).toBeNull();
  });

  it('shows a legacy free-text country unchanged', async () => {
    await useCountryLanguage('de');
    renderWithContext(AddressRow, {
      context,
      props: {
        address: anAddress({ country: 'Atlantis' }),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      },
    });

    expect(screen.getAllByText('Atlantis').length).toBeGreaterThan(0);
  });

  it('titles the map with the localized address', async () => {
    await useCountryLanguage('de');
    renderWithContext(AddressRow, {
      context,
      props: {
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
      },
    });

    await fireEvent.click(itemAt(screen.getAllByText('Karte anzeigen'), 0));

    // The row body renders twice (mobile + desktop), so both copies open the map.
    const dialog = itemAt(screen.getAllByRole('dialog'), 0);
    expect(within(dialog).getByText('Hauptstr. 1, 10115 Berlin, Deutschland')).toBeTruthy();
    // Let Leaflet finish its async mount before cleanup removes the container.
    await waitFor(() => expect(dialog.querySelector('.leaflet-container')).not.toBeNull());
  });
});
