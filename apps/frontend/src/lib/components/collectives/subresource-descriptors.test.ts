import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/api-error.js';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { anAddress, anEmail, aPhone, aUrl } from '$lib/test/fixtures.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import type { CollectiveCircleResponse } from '$shared';
import type { SubresourceDescriptor } from '../subresources/types';
import { createCollectiveDescriptors } from './subresource-descriptors';

const { api } = createTestAppContext();
const { contactDescriptors, circleDescriptor, addDetailOptions } = createCollectiveDescriptors({
  collectivesApi: api.collectives,
  collectiveContactsApi: api.collectiveContacts,
});

/** Every descriptor here drives the shared edit modal, never a custom add component. */
function formDriven(descriptor: SubresourceDescriptor) {
  if ('AddComponent' in descriptor) {
    throw new InvariantError(`${descriptor.key} has no create/update`);
  }
  return descriptor;
}

// i18n is stubbed here as an echo so the address fallback key is observable.
function t(key: string) {
  return key;
}

function contactDescriptor(key: string) {
  const descriptor = contactDescriptors.find((d) => d.key === key);
  if (descriptor === undefined) {
    throw new InvariantError(`no ${key} descriptor`);
  }
  return formDriven(descriptor);
}

const byKey = {
  phone: contactDescriptor('phone'),
  email: contactDescriptor('email'),
  address: contactDescriptor('address'),
  url: contactDescriptor('url'),
};

function aCollectiveCircle(overrides: Partial<CollectiveCircleResponse> = {}) {
  const circle: CollectiveCircleResponse = {
    id: 'circle-1',
    name: 'Inner Circle',
    color: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
  return circle;
}

describe('createCollectiveDescriptors', () => {
  describe('delete preview', () => {
    it('names the item by its main value per type', () => {
      expect(byKey.phone.deleteName(aPhone({ phoneNumber: '+1 555 0100' }), t)).toBe('+1 555 0100');
      expect(byKey.email.deleteName(anEmail({ emailAddress: 'a@b.com' }), t)).toBe('a@b.com');
      expect(byKey.url.deleteName(aUrl({ url: 'https://x.dev' }), t)).toBe('https://x.dev');
      expect(circleDescriptor.deleteName(aCollectiveCircle({ name: 'Family' }), t)).toBe('Family');
    });

    it('falls back to a translated label when an address has no street or city', () => {
      const blank = anAddress({ streetLine1: '', city: '' });
      expect(byKey.address.deleteName(blank, t)).toBe('subresources.address.thisAddress');
      expect(byKey.address.deleteName(anAddress({ streetLine1: '1 Main St' }), t)).toBe(
        '1 Main St',
      );
    });
  });

  describe('rows', () => {
    it('maps each item under the prop name its Row component expects', () => {
      const phone = aPhone();
      const email = anEmail();
      const address = anAddress();
      const url = aUrl();
      const circle = aCollectiveCircle();
      expect(byKey.phone.rowProps(phone)).toEqual({ phone });
      expect(byKey.email.rowProps(email)).toEqual({ email });
      expect(byKey.address.rowProps(address)).toEqual({ address });
      expect(byKey.url.rowProps(url)).toEqual({ url });
      expect(circleDescriptor.rowProps(circle)).toEqual({ circle });
    });
  });

  describe('editability', () => {
    it('marks the circle as add-only and the contact types as editable', () => {
      expect(circleDescriptor.editable).toBe(false);
      expect(formDriven(circleDescriptor).update).toBeUndefined();
      expect(circleDescriptor.reloadAfterMutate).toBe(true);
      for (const descriptor of contactDescriptors) {
        expect(descriptor.editable).toBe(true);
        expect(formDriven(descriptor).update).toBeTypeOf('function');
      }
    });
  });

  describe('phone errors', () => {
    it('maps the validation errors to field hints on the phone descriptor only', () => {
      const err = new ApiError(422, 'nope', { code: 'PHONE_COUNTRY_UNKNOWN' });
      expect(byKey.phone.mapError?.(err, t)).toBe('subresources.phone.unknownCountry');
      expect(byKey.phone.mapError?.(new ApiError(400, 'Invalid phone number'), t)).toBe(
        'subresources.phone.invalidNumber',
      );
      expect(byKey.phone.mapError?.(new ApiError(500, 'boom'), t)).toBeUndefined();
      expect(byKey.phone.mapError?.(new Error('other'), t)).toBeUndefined();
      expect(byKey.email.mapError).toBeUndefined();
    });
  });

  describe('add-detail options', () => {
    it('lists the contact types, then the circle', () => {
      expect(addDetailOptions.map((option) => option.event)).toEqual([
        'shortcut:collective-add-phone',
        'shortcut:collective-add-email',
        'shortcut:collective-add-address',
        'shortcut:collective-add-url',
        'shortcut:collective-add-circle',
      ]);
    });
  });
});
