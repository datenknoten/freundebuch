import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { anAddress, render, useLanguage } from '$lib/test';
import AddressEditForm from './address-edit-form.svelte';

// Hoisted above the mock factory so the test body and the mocked module share
// the same store. Hand-rolled rather than `writable`, because `vi.hoisted`
// runs before this file's imports.
const defaultCountry = vi.hoisted(() => {
  let value: string | null = null;
  const subscribers = new Set<(v: string | null) => void>();
  return {
    subscribe(run: (v: string | null) => void) {
      subscribers.add(run);
      run(value);
      return () => {
        subscribers.delete(run);
      };
    },
    set(next: string | null) {
      value = next;
      for (const run of subscribers) run(value);
    },
  };
});

vi.mock('$lib/stores/auth', () => ({ defaultCountry }));

// HierarchicalAddressInput preloads cities/streets for an existing address on mount.
vi.mock('$lib/api/address-lookup', () => ({
  getPostalCodes: vi.fn().mockResolvedValue([]),
  getCities: vi.fn().mockResolvedValue([]),
  getStreets: vi.fn().mockResolvedValue([]),
  getHouseNumbers: vi.fn().mockResolvedValue([]),
}));

beforeAll(async () => {
  await useLanguage('en');
});

describe('AddressEditForm', () => {
  it('keeps the stored country code of an existing address', () => {
    const { component } = render(AddressEditForm, {
      initialData: anAddress({ country: 'DE', city: 'Berlin' }),
    });

    expect(component.getData().country).toBe('DE');
    expect(component.isValid()).toBe(true);
  });

  it('drops a legacy free-text country and refuses to save until one is chosen', () => {
    const { component } = render(AddressEditForm, {
      initialData: anAddress({ country: 'Atlantis', city: 'Poseidonia' }),
    });

    expect(component.getData().country).toBe('');
    expect(component.isValid()).toBe(false);
  });
});

describe('default country', () => {
  afterEach(() => {
    defaultCountry.set(null);
  });

  it('preselects the default country for a new address', () => {
    defaultCountry.set('AT');
    const { component } = render(AddressEditForm, {});

    expect(component.getData().country).toBe('AT');
  });

  it('leaves the country empty for a new address without a default', () => {
    const { component } = render(AddressEditForm, {});

    expect(component.getData().country).toBe('');
  });

  it('keeps the stored country of an existing address over the default', () => {
    defaultCountry.set('AT');
    const { component } = render(AddressEditForm, {
      initialData: anAddress({ country: 'DE' }),
    });

    expect(component.getData().country).toBe('DE');
  });
});
