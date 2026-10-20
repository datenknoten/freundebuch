import type { ComponentProps } from 'svelte';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '$lib/app-context.js';
import AddressEditForm from '$lib/components/friends/subresources/AddressEditForm.svelte';
import { anAddress } from '$lib/test/fixtures.js';
import { useLanguage } from '$lib/test/locale.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';

let context: AppContext;

function renderForm(props: ComponentProps<typeof AddressEditForm>) {
  return renderWithContext(AddressEditForm, { context, props });
}

async function useDefaultCountry(country: string) {
  vi.spyOn(context.api.auth, 'updatePreferences').mockResolvedValue({
    preferences: { defaultCountry: country },
  });
  await context.stores.auth.updatePreferences({ defaultCountry: country });
}

beforeAll(async () => {
  await useLanguage('en');
});

beforeEach(() => {
  vi.clearAllMocks();
  context = createTestAppContext();
  // HierarchicalAddressInput preloads cities and streets of an existing address on mount.
  vi.spyOn(context.api.addressLookup, 'listCities').mockResolvedValue([]);
  vi.spyOn(context.api.addressLookup, 'listStreets').mockResolvedValue([]);
  vi.spyOn(context.api.addressLookup, 'listHouseNumbers').mockResolvedValue([]);
  vi.spyOn(context.api.addressLookup, 'listPostalCodes').mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AddressEditForm', () => {
  describe('an existing address', () => {
    it('keeps the stored country code', () => {
      const { component } = renderForm({
        initialData: anAddress({ country: 'DE', city: 'Berlin' }),
      });

      expect(component.getData().country).toBe('DE');
      expect(component.isValid()).toBe(true);
    });

    it('drops a legacy free-text country and refuses to save until one is chosen', () => {
      const { component } = renderForm({
        initialData: anAddress({ country: 'Atlantis', city: 'Poseidonia' }),
      });

      expect(component.getData().country).toBe('');
      expect(component.isValid()).toBe(false);
    });

    it('keeps the stored country over the default', async () => {
      await useDefaultCountry('AT');
      const { component } = renderForm({ initialData: anAddress({ country: 'DE' }) });

      expect(component.getData().country).toBe('DE');
    });
  });

  describe('a new address', () => {
    it('preselects the default country', async () => {
      await useDefaultCountry('AT');
      const { component } = renderForm({});

      expect(component.getData().country).toBe('AT');
    });

    it('leaves the country empty without a default', () => {
      const { component } = renderForm({});

      expect(component.getData().country).toBe('');
    });
  });
});
