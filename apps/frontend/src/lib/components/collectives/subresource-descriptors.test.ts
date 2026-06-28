import { describe, expect, it } from 'vitest';
import type { CollectiveCircleInfo } from '$lib/api/collectives';
import { anAddress, anEmail, aPhone, aUrl } from '$lib/test';
import { circleDescriptor, contactDescriptors } from './subresource-descriptors';

// i18n is stubbed here as an echo so the address fallback key is observable.
const t = (key: string) => key;

const byKey = Object.fromEntries(contactDescriptors.map((d) => [d.key, d]));

const aCircle = (overrides: Partial<CollectiveCircleInfo> = {}): CollectiveCircleInfo => ({
  id: 'circle-1',
  name: 'Inner Circle',
  color: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('collective subresource descriptors', () => {
  it('extracts the delete-preview name per type', () => {
    expect(byKey.phone.deleteName(aPhone({ phoneNumber: '+1 555 0100' }), t)).toBe('+1 555 0100');
    expect(byKey.email.deleteName(anEmail({ emailAddress: 'a@b.com' }), t)).toBe('a@b.com');
    expect(byKey.url.deleteName(aUrl({ url: 'https://x.dev' }), t)).toBe('https://x.dev');
    expect(circleDescriptor.deleteName(aCircle({ name: 'Family' }), t)).toBe('Family');
  });

  it('falls back to a translated label when an address has no street or city', () => {
    const blank = anAddress({ streetLine1: '', city: '' });
    expect(byKey.address.deleteName(blank, t)).toBe('subresources.address.thisAddress');
    expect(byKey.address.deleteName(anAddress({ streetLine1: '1 Main St' }), t)).toBe('1 Main St');
  });

  it('maps each item under the prop name its Row component expects', () => {
    const phone = aPhone();
    const email = anEmail();
    const address = anAddress();
    const url = aUrl();
    const circle = aCircle();
    expect(byKey.phone.rowProps(phone)).toEqual({ phone });
    expect(byKey.email.rowProps(email)).toEqual({ email });
    expect(byKey.address.rowProps(address)).toEqual({ address });
    expect(byKey.url.rowProps(url)).toEqual({ url });
    expect(circleDescriptor.rowProps(circle)).toEqual({ circle });
  });

  it('marks circle as add-only and the contact types as editable', () => {
    expect(circleDescriptor.editable).toBe(false);
    expect(circleDescriptor.update).toBeUndefined();
    expect(circleDescriptor.reloadAfterMutate).toBe(true);
    for (const d of contactDescriptors) {
      expect(d.editable).toBe(true);
      expect(d.update).toBeTypeOf('function');
    }
  });

  it('maps the phone unknown-country error and only registers it on the phone descriptor', async () => {
    const { ApiError } = await import('$lib/api/client');
    const err = new ApiError(422, 'nope', 'PHONE_COUNTRY_UNKNOWN');
    expect(byKey.phone.mapError?.(err, t)).toBe('subresources.phone.unknownCountry');
    expect(byKey.phone.mapError?.(new Error('other'), t)).toBeUndefined();
    expect(byKey.email.mapError).toBeUndefined();
  });
});
