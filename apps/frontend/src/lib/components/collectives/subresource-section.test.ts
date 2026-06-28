import PhoneIcon from 'svelte-heros-v2/Phone.svelte';
import { describe, expect, it, vi } from 'vitest';
import { aPhone, fireEvent, render, screen, waitFor } from '$lib/test';
import { CircleRow, PhoneEditForm, PhoneRow } from '../friends/subresources';
import type { SubresourceDescriptor, SubresourceItem } from './subresource-descriptors';
import SubresourceSection from './subresource-section.svelte';

// Echo i18n keys so titles/labels are assertable without translation files.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

/**
 * The generic section is driven entirely by its descriptor, so tests inject a
 * fake one: real Row/Form components for rendering, but vi.fn() CRUD closures —
 * no API module mocking required.
 */
function fakePhoneDescriptor(
  overrides: Partial<SubresourceDescriptor> = {},
): SubresourceDescriptor {
  return {
    key: 'phone',
    shortcutEvent: 'shortcut:test-add',
    icon: PhoneIcon,
    sectionTitleKey: 'section.title',
    addLabelKey: 'section.add',
    addShortcut: 'a p',
    addShortcutLabel: 'shortcuts.add.phone',
    editable: true,
    modalTypeNameKey: 'modal.type',
    load: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn().mockResolvedValue({ message: 'ok' }),
    FormComponent: PhoneEditForm as unknown as SubresourceDescriptor['FormComponent'],
    formProps: ({ editingData }) => ({ initialData: editingData ?? undefined }),
    RowComponent: PhoneRow as unknown as SubresourceDescriptor['RowComponent'],
    rowProps: (item) => ({ phone: item }),
    deleteName: (item) => (item as ReturnType<typeof aPhone>).phoneNumber,
    deleteTitle: 'Delete Phone Number',
    deleteDescription: 'Are you sure?',
    ...overrides,
  } as SubresourceDescriptor;
}

function renderSection(descriptor: SubresourceDescriptor) {
  return render(SubresourceSection, {
    descriptor,
    collectiveId: 'c1',
    collectiveName: 'Test Collective',
  });
}

describe('SubresourceSection', () => {
  it('renders loaded items as rows under the section heading', async () => {
    const descriptor = fakePhoneDescriptor({
      load: vi.fn().mockResolvedValue([aPhone({ phoneNumber: '+1 555 0100' })]),
    });
    renderSection(descriptor);

    expect(await screen.findByText('section.title')).toBeTruthy();
    expect((await screen.findAllByText('+1 555 0100')).length).toBeGreaterThan(0);
    expect(descriptor.load).toHaveBeenCalledWith('c1');
  });

  it('opens the add modal from the header button', async () => {
    renderSection(fakePhoneDescriptor({ load: vi.fn().mockResolvedValue([aPhone()]) }));

    await fireEvent.click(await screen.findByText('section.add'));
    // modalTitle = `${add} ${typeName}` with echoed keys
    expect(await screen.findByText('friendDetail.modal.add modal.type')).toBeTruthy();
  });

  it('opens the add modal via the keyboard shortcut even when the section is empty', async () => {
    renderSection(fakePhoneDescriptor({ load: vi.fn().mockResolvedValue([]) }));

    // Empty section renders no header, but the shortcut listener is still mounted.
    await waitFor(() => expect(screen.queryByText('section.add')).toBeNull());
    window.dispatchEvent(new CustomEvent('shortcut:test-add'));

    expect(await screen.findByText('friendDetail.modal.add modal.type')).toBeTruthy();
  });

  it('creates a new item and appends it to the list', async () => {
    const created = aPhone({ phoneNumber: '+49 30 9999' });
    const create = vi.fn().mockResolvedValue(created);
    const descriptor = fakePhoneDescriptor({
      load: vi.fn().mockResolvedValue([aPhone({ phoneNumber: '+1 555 0100' })]),
      create,
    });
    renderSection(descriptor);

    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+49 30 9999' },
    });
    await fireEvent.click(screen.getByText('subresources.common.save'));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ phone_number: '+49 30 9999' }),
    );
    expect((await screen.findAllByText('+49 30 9999')).length).toBeGreaterThan(0);
  });

  it('edits an existing row, calls update, and replaces it in the list', async () => {
    const phone = aPhone({ phoneNumber: '+1 555 0100' });
    const updated = aPhone({ id: phone.id, phoneNumber: '+1 555 0200' });
    const update = vi.fn().mockResolvedValue(updated);
    const descriptor = fakePhoneDescriptor({
      load: vi.fn().mockResolvedValue([phone]),
      update,
    });
    renderSection(descriptor);

    await fireEvent.click((await screen.findAllByLabelText('Edit phone'))[0]);
    expect(await screen.findByText('friendDetail.modal.edit modal.type')).toBeTruthy();

    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+1 555 0200' },
    });
    await fireEvent.click(screen.getByText('subresources.common.save'));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith(
      'c1',
      phone.id,
      expect.objectContaining({ phone_number: '+1 555 0200' }),
    );
    expect((await screen.findAllByText('+1 555 0200')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryAllByText('+1 555 0100')).toHaveLength(0));
  });

  it('confirms deletion, calls remove, and drops the row', async () => {
    const phone = aPhone({ phoneNumber: '+1 555 0100' });
    const remove = vi.fn().mockResolvedValue({ message: 'ok' });
    const descriptor = fakePhoneDescriptor({
      load: vi.fn().mockResolvedValue([phone]),
      remove,
    });
    renderSection(descriptor);

    await fireEvent.click((await screen.findAllByLabelText('Delete phone'))[0]);
    expect(await screen.findByText('Delete Phone Number')).toBeTruthy();

    await fireEvent.click(screen.getByText('subresources.common.delete'));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('c1', phone.id));
    await waitFor(() => expect(screen.queryAllByText('+1 555 0100')).toHaveLength(0));
  });

  it('reloads instead of patching locally when the descriptor sets reloadAfterMutate (circle)', async () => {
    const first = aPhone({ phoneNumber: '+1 555 0100' });
    const second = aPhone({ phoneNumber: '+1 555 0200' });
    // Circle-style: create/remove return only a message, so the section reloads.
    const load = vi
      .fn()
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([first, second])
      .mockResolvedValue([first]);
    const create = vi.fn().mockResolvedValue({ message: 'added' });
    const remove = vi.fn().mockResolvedValue({ message: 'removed' });
    const descriptor = fakePhoneDescriptor({ load, create, remove, reloadAfterMutate: true });
    renderSection(descriptor);

    // Create -> create() then reload() surfaces the second item.
    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+1 555 0200' },
    });
    await fireEvent.click(screen.getByText('subresources.common.save'));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect((await screen.findAllByText('+1 555 0200')).length).toBeGreaterThan(0);

    // Delete -> remove() then reload() drops it again.
    await fireEvent.click((await screen.findAllByLabelText('Delete phone'))[0]);
    await fireEvent.click(screen.getByText('subresources.common.delete'));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryAllByText('+1 555 0200')).toHaveLength(0));
  });

  it('ignores a stale load when the collective changes while a request is in flight', async () => {
    // Deferred loads let us resolve the old collective's request *after* the new one.
    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }
    const first = deferred<SubresourceItem[]>();
    const second = deferred<SubresourceItem[]>();
    const load = vi.fn((id: string) => (id === 'c1' ? first.promise : second.promise));
    const descriptor = fakePhoneDescriptor({ load });

    const { rerender } = render(SubresourceSection, {
      descriptor,
      collectiveId: 'c1',
      collectiveName: 'Test Collective',
    });

    // Switch to a new collective; its (faster) response lands first.
    await rerender({ descriptor, collectiveId: 'c2', collectiveName: 'Test Collective' });
    second.resolve([aPhone({ phoneNumber: '+2 222' })]);
    expect((await screen.findAllByText('+2 222')).length).toBeGreaterThan(0);

    // The previous collective's slow response resolves late and must be dropped.
    first.resolve([aPhone({ phoneNumber: '+1 111' })]);
    await waitFor(() => expect(load).toHaveBeenCalledWith('c2'));
    expect(screen.queryByText('+1 111')).toBeNull();
    expect((await screen.findAllByText('+2 222')).length).toBeGreaterThan(0);
  });

  it('resets items and any open modal when the collective changes', async () => {
    const phoneC1 = aPhone({ phoneNumber: '+1 555 0100' });
    const phoneC2 = aPhone({ phoneNumber: '+2 222 0000' });
    const load = vi.fn((id: string) => Promise.resolve(id === 'c1' ? [phoneC1] : [phoneC2]));
    const descriptor = fakePhoneDescriptor({ load });

    const { rerender } = render(SubresourceSection, {
      descriptor,
      collectiveId: 'c1',
      collectiveName: 'Test Collective',
    });

    // Open the edit modal on the first collective.
    await fireEvent.click((await screen.findAllByLabelText('Edit phone'))[0]);
    expect(await screen.findByText('friendDetail.modal.edit modal.type')).toBeTruthy();

    // Navigate to another collective without unmounting the component.
    await rerender({ descriptor, collectiveId: 'c2', collectiveName: 'Test Collective' });

    // Stale modal is closed, the previous item is gone, the new one is loaded.
    await waitFor(() =>
      expect(screen.queryByText('friendDetail.modal.edit modal.type')).toBeNull(),
    );
    await waitFor(() => expect(load).toHaveBeenCalledWith('c2'));
    expect((await screen.findAllByText('+2 222 0000')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryAllByText('+1 555 0100')).toHaveLength(0));
  });

  it('does not prompt about unsaved changes for forms that do not opt into dirty tracking', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderSection(fakePhoneDescriptor({ load: vi.fn().mockResolvedValue([aPhone()]) }));

    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+1 555 9999' },
    });
    // Close via the modal X. Without tracksDirty the modal must not prompt.
    await fireEvent.click(screen.getByLabelText('subresources.common.close'));

    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('friendDetail.modal.add modal.type')).toBeNull());
    confirmSpy.mockRestore();
  });

  it('prompts about unsaved changes when the descriptor opts into dirty tracking (circle)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderSection(
      fakePhoneDescriptor({ tracksDirty: true, load: vi.fn().mockResolvedValue([aPhone()]) }),
    );

    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+1 555 9999' },
    });
    await fireEvent.click(screen.getByLabelText('subresources.common.close'));

    // Dirty -> DetailEditModal asks before discarding (confirm stubbed to cancel).
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('ignores an out-of-order reload for the same collective so the latest wins', async () => {
    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }
    const mountLoad = deferred<SubresourceItem[]>();
    const reloadLoad = deferred<SubresourceItem[]>();
    const pending = [mountLoad.promise, reloadLoad.promise];
    let call = 0;
    const load = vi.fn(() => pending[call++]);
    // reloadAfterMutate makes create() trigger a second reload for the same id.
    const descriptor = fakePhoneDescriptor({
      load,
      create: vi.fn().mockResolvedValue({ message: 'added' }),
      reloadAfterMutate: true,
    });
    renderSection(descriptor);

    // Empty section (mount load still pending) — open via the shortcut and save.
    window.dispatchEvent(new CustomEvent('shortcut:test-add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+1 555 0100' },
    });
    await fireEvent.click(screen.getByText('subresources.common.save'));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    // The later reload resolves first; the earlier (mount) reload resolves late
    // and must be dropped rather than reverting the list.
    reloadLoad.resolve([aPhone({ phoneNumber: '+2 222 0000' })]);
    expect((await screen.findAllByText('+2 222 0000')).length).toBeGreaterThan(0);
    mountLoad.resolve([aPhone({ phoneNumber: '+1 111 0000' })]);
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('+1 111 0000')).toBeNull();
    expect((await screen.findAllByText('+2 222 0000')).length).toBeGreaterThan(0);
  });

  it('omits the edit affordance for a non-editable (circle-style) descriptor', async () => {
    const descriptor = fakePhoneDescriptor({
      editable: false,
      RowComponent: CircleRow as unknown as SubresourceDescriptor['RowComponent'],
      rowProps: (item) => ({ circle: { id: item.id, name: 'Inner', color: null } }),
      load: vi.fn().mockResolvedValue([aPhone()]),
    });
    renderSection(descriptor);

    // CircleRow exposes only a remove action, no edit button.
    expect((await screen.findAllByLabelText('Remove from circle')).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Edit phone')).toBeNull();
  });
});
