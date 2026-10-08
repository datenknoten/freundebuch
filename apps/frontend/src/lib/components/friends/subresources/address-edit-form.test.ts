import { beforeAll, describe, expect, it, vi } from 'vitest';
import { anAddress, render, useLanguage } from '$lib/test';
import AddressEditForm from './address-edit-form.svelte';

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
