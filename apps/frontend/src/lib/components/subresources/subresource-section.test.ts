import PhoneIcon from 'svelte-heros-v2/Phone.svelte';
import { describe, expect, it, vi } from 'vitest';
import { addMember } from '$lib/api/collectives';
import { aPhone, fireEvent, render, screen, waitFor, within } from '$lib/test';
import { createCollectiveDescriptor } from '../friends/subresource-descriptors';
import { CircleRow, PhoneEditForm, PhoneRow } from '../friends/subresources';
import SubresourceSection from './subresource-section.svelte';
import type { SubresourceDescriptor, SubresourceItem } from './types';

// Echo i18n keys so titles/labels are assertable without translation files.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

// The collective descriptor mounts the real AddToCollectiveModal, which reads
// its options from the collectives store and posts through the API module.
vi.mock('$lib/stores/collectives', () => {
  const readableOf = <T>(value: T) => ({
    subscribe: (run: (v: T) => void) => {
      run(value);
      return () => undefined;
    },
  });
  return {
    collectives: {
      loadCollectives: vi.fn().mockResolvedValue(undefined),
      loadTypes: vi.fn().mockResolvedValue(undefined),
    },
    collectivesList: readableOf([
      {
        id: 'col-1',
        name: 'Book Club',
        type: { id: 'type-1', name: 'Club' },
        photoThumbnailUrl: null,
        deletedAt: null,
      },
    ]),
    collectiveTypes: readableOf([
      { id: 'type-1', name: 'Club', roles: [{ id: 'role-1', label: 'Member', sortOrder: 0 }] },
    ]),
    previewMemberRelationships: vi.fn().mockResolvedValue({ relationships: [] }),
  };
});

vi.mock('$lib/api/collectives', () => ({
  addMember: vi.fn().mockResolvedValue({ id: 'membership-1' }),
  removeMember: vi.fn().mockResolvedValue({ message: 'removed' }),
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
    FormComponent: PhoneEditForm,
    formProps: ({ editingData }) => ({ initialData: editingData ?? undefined }),
    RowComponent: PhoneRow,
    rowProps: (item) => ({ phone: item }),
    deleteName: (item) => (item as ReturnType<typeof aPhone>).phoneNumber,
    deleteTitleKey: 'modal.deletePhone',
    deleteDescriptionKey: 'modal.confirmDeletePhone',
    ...overrides,
  } as SubresourceDescriptor;
}

function renderSection(descriptor: SubresourceDescriptor) {
  return render(SubresourceSection, {
    descriptor,
    ownerId: 'c1',
    ownerName: 'Test Collective',
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

    await fireEvent.click((await screen.findAllByLabelText('subresources.phone.editAria'))[0]);
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

    await fireEvent.click((await screen.findAllByLabelText('subresources.phone.deleteAria'))[0]);
    expect(await screen.findByText('modal.deletePhone')).toBeTruthy();

    await fireEvent.click(within(screen.getByRole('dialog')).getByText('common.delete'));
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith('c1', expect.objectContaining({ id: phone.id })),
    );
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
    await fireEvent.click((await screen.findAllByLabelText('subresources.phone.deleteAria'))[0]);
    await fireEvent.click(within(screen.getByRole('dialog')).getByText('common.delete'));
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
      ownerId: 'c1',
      ownerName: 'Test Collective',
    });

    // Switch to a new collective; its (faster) response lands first.
    await rerender({ descriptor, ownerId: 'c2', ownerName: 'Test Collective' });
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
      ownerId: 'c1',
      ownerName: 'Test Collective',
    });

    // Open the edit modal on the first collective.
    await fireEvent.click((await screen.findAllByLabelText('subresources.phone.editAria'))[0]);
    expect(await screen.findByText('friendDetail.modal.edit modal.type')).toBeTruthy();

    // Navigate to another collective without unmounting the component.
    await rerender({ descriptor, ownerId: 'c2', ownerName: 'Test Collective' });

    // Stale modal is closed, the previous item is gone, the new one is loaded.
    await waitFor(() =>
      expect(screen.queryByText('friendDetail.modal.edit modal.type')).toBeNull(),
    );
    await waitFor(() => expect(load).toHaveBeenCalledWith('c2'));
    expect((await screen.findAllByText('+2 222 0000')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryAllByText('+1 555 0100')).toHaveLength(0));
  });

  it('cancels a pending afterSave when the collective changes', async () => {
    const cancel = vi.fn();
    const descriptor = fakePhoneDescriptor({
      afterSave: vi.fn().mockReturnValue(cancel),
      create: vi.fn().mockResolvedValue(aPhone({ phoneNumber: '+49 30 9999' })),
      load: vi.fn().mockResolvedValue([aPhone()]),
    });

    const { rerender } = render(SubresourceSection, {
      descriptor,
      ownerId: 'c1',
      ownerName: 'Test Collective',
    });

    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+49 30 9999' },
    });
    await fireEvent.click(screen.getByText('subresources.common.save'));
    await waitFor(() => expect(descriptor.afterSave).toHaveBeenCalledTimes(1));

    await rerender({ descriptor, ownerId: 'c2', ownerName: 'Other' });

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending afterSave when the section unmounts', async () => {
    const cancel = vi.fn();
    const descriptor = fakePhoneDescriptor({
      afterSave: vi.fn().mockReturnValue(cancel),
      create: vi.fn().mockResolvedValue(aPhone({ phoneNumber: '+49 30 9999' })),
      load: vi.fn().mockResolvedValue([aPhone()]),
    });

    const { unmount } = render(SubresourceSection, {
      descriptor,
      ownerId: 'c1',
      ownerName: 'Test Collective',
    });

    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+49 30 9999' },
    });
    await fireEvent.click(screen.getByText('subresources.common.save'));
    await waitFor(() => expect(descriptor.afterSave).toHaveBeenCalledTimes(1));

    unmount();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('keeps a pending afterSave alive when the same owner re-renders', async () => {
    const cancel = vi.fn();
    const descriptor = fakePhoneDescriptor({
      afterSave: vi.fn().mockReturnValue(cancel),
      create: vi.fn().mockResolvedValue(aPhone({ phoneNumber: '+49 30 9999' })),
      load: vi.fn().mockResolvedValue([aPhone()]),
    });

    const { rerender } = render(SubresourceSection, {
      descriptor,
      ownerId: 'c1',
      ownerName: 'Test Collective',
    });

    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+49 30 9999' },
    });
    await fireEvent.click(screen.getByText('subresources.common.save'));
    await waitFor(() => expect(descriptor.afterSave).toHaveBeenCalledTimes(1));

    // The refetch itself refreshes the owner, which re-renders the section with
    // new props for the same owner — the remaining attempts must survive that.
    await rerender({ descriptor, ownerId: 'c1', ownerName: 'Renamed' });

    expect(cancel).not.toHaveBeenCalled();
  });

  it('does not ask about unsaved changes for forms that do not opt into dirty tracking', async () => {
    renderSection(fakePhoneDescriptor({ load: vi.fn().mockResolvedValue([aPhone()]) }));

    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+1 555 9999' },
    });
    // Close via the modal X. Without tracksDirty the modal must not ask.
    await fireEvent.click(screen.getByLabelText('common.close'));

    expect(screen.queryByText('subresources.common.unsavedChanges')).toBeNull();
    await waitFor(() => expect(screen.queryByText('friendDetail.modal.add modal.type')).toBeNull());
  });

  it('asks about unsaved changes when the descriptor opts into dirty tracking (circle)', async () => {
    renderSection(
      fakePhoneDescriptor({ tracksDirty: true, load: vi.fn().mockResolvedValue([aPhone()]) }),
    );

    await fireEvent.click(await screen.findByText('section.add'));
    await fireEvent.input(await screen.findByLabelText(/subresources\.phone\.phoneNumber/), {
      target: { value: '+1 555 9999' },
    });
    await fireEvent.click(screen.getByLabelText('common.close'));

    // Dirty -> DetailEditModal asks inside itself and stays open.
    expect(screen.getByText('subresources.common.unsavedChanges')).toBeTruthy();
    expect(screen.getByText('subresources.common.keepEditing')).toBeTruthy();
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
      RowComponent: CircleRow,
      rowProps: (item) => ({ circle: { id: item.id, name: 'Inner', color: null } }),
      load: vi.fn().mockResolvedValue([aPhone()]),
    });
    renderSection(descriptor);

    // CircleRow exposes only a remove action, no edit button.
    expect(
      (await screen.findAllByLabelText('subresources.circle.removeAria')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText('subresources.phone.editAria')).toBeNull();
  });

  it('numbers hint badges over linkable rows only, so a non-linkable row shifts nothing', async () => {
    const descriptor = fakePhoneDescriptor({
      linkable: (item) => item.id !== 'b',
      load: vi
        .fn()
        .mockResolvedValue([
          aPhone({ id: 'a', phoneNumber: '+1 111 0000' }),
          aPhone({ id: 'b', phoneNumber: '+1 222 0000' }),
          aPhone({ id: 'c', phoneNumber: '+1 333 0000' }),
        ]),
    });
    render(SubresourceSection, {
      descriptor,
      ownerId: 'c1',
      ownerName: 'Test Collective',
      linkStartIndex: 5,
    });

    const shortcutFor = async (number: string) => {
      const matches = await screen.findAllByText(number);
      const link = matches.map((el) => el.closest('a')).find((el) => el !== null);
      return link?.getAttribute('data-shortcut') ?? null;
    };

    // getKeyboardHint(5) === '6', getKeyboardHint(6) === '7'.
    expect(await shortcutFor('+1 111 0000')).toBe('o 6');
    expect(await shortcutFor('+1 222 0000')).toBeNull();
    expect(await shortcutFor('+1 333 0000')).toBe('o 7');
  });

  it('closes the custom add component after a successful add', async () => {
    const onChanged = vi.fn();
    render(SubresourceSection, {
      descriptor: createCollectiveDescriptor(onChanged),
      ownerId: 'f1',
      ownerName: 'Ada Lovelace',
      items: [
        {
          id: 'col-9',
          membershipId: 'm-9',
          name: 'Chess Club',
          typeName: 'Club',
          isActive: true,
          role: { id: 'role-9', label: 'Member' },
        } as unknown as SubresourceItem,
      ],
    });

    await fireEvent.click(await screen.findByText('friendDetail.actions.addCollective'));

    const search = await screen.findByRole('combobox');
    await fireEvent.focus(search);
    await fireEvent.click(await screen.findByText('Book Club'));
    await fireEvent.click(await screen.findByText('friendDetail.addToCollective.submit'));

    await waitFor(() =>
      expect(vi.mocked(addMember)).toHaveBeenCalledWith(
        'col-1',
        expect.objectContaining({ friend_id: 'f1', role_id: 'role-1' }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});
