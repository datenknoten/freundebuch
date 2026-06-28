import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '$lib/api/collectives';
import { aPhone, aUrl } from '$lib/test';
import { circleDescriptor, contactDescriptors } from './subresource-descriptors';

// Every descriptor closure just delegates to one API function; mock the whole
// module so we can assert the wiring (load/create/update/remove) per type.
vi.mock('$lib/api/collectives', () => ({
  listPhones: vi.fn().mockResolvedValue([]),
  addPhone: vi.fn(),
  updatePhone: vi.fn(),
  deletePhone: vi.fn(),
  listEmails: vi.fn().mockResolvedValue([]),
  addEmail: vi.fn(),
  updateEmail: vi.fn(),
  deleteEmail: vi.fn(),
  listAddresses: vi.fn().mockResolvedValue([]),
  addAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  listUrls: vi.fn().mockResolvedValue([]),
  addUrl: vi.fn(),
  updateUrl: vi.fn(),
  deleteUrl: vi.fn(),
  getCollectiveCircles: vi.fn().mockResolvedValue([]),
  addCollectiveToCircle: vi.fn(),
  removeCollectiveFromCircle: vi.fn(),
}));

const byKey = Object.fromEntries(contactDescriptors.map((d) => [d.key, d]));

afterEach(() => {
  vi.clearAllMocks();
});

describe('descriptor CRUD delegation', () => {
  it('wires phone load/create/update/remove to the phone API', async () => {
    const data = { phone_number: '+1 555 0100' } as never;
    await byKey.phone.load('c1');
    await byKey.phone.create('c1', data);
    await byKey.phone.update?.('c1', 'p1', data);
    await byKey.phone.remove('c1', 'p1');
    expect(api.listPhones).toHaveBeenCalledWith('c1');
    expect(api.addPhone).toHaveBeenCalledWith('c1', data);
    expect(api.updatePhone).toHaveBeenCalledWith('c1', 'p1', data);
    expect(api.deletePhone).toHaveBeenCalledWith('c1', 'p1');
  });

  it('wires email load/create/update/remove to the email API', async () => {
    const data = { email_address: 'a@b.com' } as never;
    await byKey.email.load('c1');
    await byKey.email.create('c1', data);
    await byKey.email.update?.('c1', 'e1', data);
    await byKey.email.remove('c1', 'e1');
    expect(api.listEmails).toHaveBeenCalledWith('c1');
    expect(api.addEmail).toHaveBeenCalledWith('c1', data);
    expect(api.updateEmail).toHaveBeenCalledWith('c1', 'e1', data);
    expect(api.deleteEmail).toHaveBeenCalledWith('c1', 'e1');
  });

  it('wires address load/create/update/remove to the address API', async () => {
    const data = { street_line_1: '1 Main St' } as never;
    await byKey.address.load('c1');
    await byKey.address.create('c1', data);
    await byKey.address.update?.('c1', 'a1', data);
    await byKey.address.remove('c1', 'a1');
    expect(api.listAddresses).toHaveBeenCalledWith('c1');
    expect(api.addAddress).toHaveBeenCalledWith('c1', data);
    expect(api.updateAddress).toHaveBeenCalledWith('c1', 'a1', data);
    expect(api.deleteAddress).toHaveBeenCalledWith('c1', 'a1');
  });

  it('wires url load/create/update/remove to the url API', async () => {
    const data = { url: 'https://x.dev' } as never;
    await byKey.url.load('c1');
    await byKey.url.create('c1', data);
    await byKey.url.update?.('c1', 'u1', data);
    await byKey.url.remove('c1', 'u1');
    expect(api.listUrls).toHaveBeenCalledWith('c1');
    expect(api.addUrl).toHaveBeenCalledWith('c1', data);
    expect(api.updateUrl).toHaveBeenCalledWith('c1', 'u1', data);
    expect(api.deleteUrl).toHaveBeenCalledWith('c1', 'u1');
  });

  it('unwraps the circle id on create and delegates load/remove (add-only)', async () => {
    await circleDescriptor.load('c1');
    await circleDescriptor.create('c1', { circleId: 'circle-9' } as never);
    await circleDescriptor.remove('c1', 'circle-9');
    expect(api.getCollectiveCircles).toHaveBeenCalledWith('c1');
    expect(api.addCollectiveToCircle).toHaveBeenCalledWith('c1', 'circle-9');
    expect(api.removeCollectiveFromCircle).toHaveBeenCalledWith('c1', 'circle-9');
  });
});

describe('descriptor formProps', () => {
  const ctx = (over = {}) => ({
    editingData: null,
    editingId: null,
    itemCount: 0,
    items: [],
    isLoading: false,
    ...over,
  });

  it('defaults primary on for the first phone/email/address but not when editing', () => {
    for (const d of [byKey.phone, byKey.email, byKey.address]) {
      expect(d.formProps(ctx()).defaultPrimary).toBe(true);
      expect(d.formProps(ctx({ itemCount: 2 })).defaultPrimary).toBe(false);
      expect(d.formProps(ctx({ editingId: 'x' })).defaultPrimary).toBe(false);
    }
  });

  it('passes initialData and disabled through, and url omits defaultPrimary', () => {
    const phone = aPhone();
    expect(byKey.phone.formProps(ctx({ editingData: phone, isLoading: true }))).toMatchObject({
      initialData: phone,
      disabled: true,
    });
    const url = aUrl();
    const urlProps = byKey.url.formProps(ctx({ editingData: url }));
    expect(urlProps).toMatchObject({ initialData: url });
    expect(urlProps.defaultPrimary).toBeUndefined();
  });

  it('hands circle the current items as existingCircles', () => {
    const items = [{ id: 'c', name: 'Inner', color: null }] as never;
    expect(circleDescriptor.formProps(ctx({ items }))).toMatchObject({
      existingCircles: items,
      disabled: false,
    });
  });
});

describe('address afterSave geocoding refetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reloads three times on the geocoding backoff schedule', () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    byKey.address.afterSave?.(reload);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(800);
    expect(reload).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(reload).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(4500);
    expect(reload).toHaveBeenCalledTimes(3);
  });

  it('is only defined for the address descriptor', () => {
    expect(byKey.phone.afterSave).toBeUndefined();
    expect(byKey.email.afterSave).toBeUndefined();
    expect(byKey.url.afterSave).toBeUndefined();
    expect(circleDescriptor.afterSave).toBeUndefined();
  });
});
