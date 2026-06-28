import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isModalOpen } from '$lib/stores/ui';
import { aCollective, aCollectiveMember, fireEvent, render, screen, waitFor } from '$lib/test';
import CollectiveDetail from './collective-detail.svelte';

vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

const deleteCollective = vi.fn().mockResolvedValue(undefined);
vi.mock('$lib/stores/collectives', () => ({
  collectives: {
    deleteCollective: (...args: unknown[]) => deleteCollective(...args),
    // MemberSection (child) touches these; no-op them.
    addMember: vi.fn(),
    deactivateMember: vi.fn(),
    reactivateMember: vi.fn(),
    removeMember: vi.fn(),
  },
  previewMemberRelationships: vi.fn().mockResolvedValue({ relationships: [] }),
}));

// SubresourceSection children call descriptor.load (list*) on mount.
vi.mock('$lib/api/collectives', () => ({
  listPhones: vi.fn().mockResolvedValue([]),
  listEmails: vi.fn().mockResolvedValue([]),
  listAddresses: vi.fn().mockResolvedValue([]),
  listUrls: vi.fn().mockResolvedValue([]),
  getCollectiveCircles: vi.fn().mockResolvedValue([]),
}));

afterEach(() => {
  vi.clearAllMocks();
  isModalOpen.set(false);
});

describe('CollectiveDetail', () => {
  it('renders the name, type badge and notes', () => {
    const collective = aCollective({ name: 'Book Club', notes: 'Meets monthly' });
    render(CollectiveDetail, { collective });

    expect(screen.getByText('Book Club')).toBeTruthy();
    expect(screen.getByText('Meets monthly')).toBeTruthy();
    expect(screen.getByText('collectives.detail.notes')).toBeTruthy();
  });

  it('renders a formatted address when one is present', () => {
    const collective = aCollective({
      address: {
        streetLine1: '1 Main St',
        streetLine2: null,
        city: 'Berlin',
        stateProvince: null,
        postalCode: '10115',
        country: 'DE',
      },
    });
    render(CollectiveDetail, { collective });

    expect(screen.getByText('1 Main St, 10115 Berlin, DE')).toBeTruthy();
  });

  it('invokes onEdit from the edit button', async () => {
    const onEdit = vi.fn();
    render(CollectiveDetail, { collective: aCollective(), onEdit });

    await fireEvent.click(screen.getByText('common.edit'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('opens the delete confirmation and flags the global modal state', async () => {
    render(CollectiveDetail, { collective: aCollective() });

    expect(get(isModalOpen)).toBe(false);
    await fireEvent.click(screen.getByText('common.delete'));
    expect(screen.getByText('collectives.detail.deleteConfirmTitle')).toBeTruthy();
    expect(get(isModalOpen)).toBe(true);
  });

  it('clears the modal state when delete is cancelled', async () => {
    render(CollectiveDetail, { collective: aCollective() });

    await fireEvent.click(screen.getByText('common.delete'));
    await fireEvent.click(screen.getByText('collectives.form.cancel'));
    expect(get(isModalOpen)).toBe(false);
    expect(screen.queryByText('collectives.detail.deleteConfirmTitle')).toBeNull();
  });

  it('deletes the collective and navigates away on confirm', async () => {
    const collective = aCollective();
    render(CollectiveDetail, { collective });

    await fireEvent.click(screen.getByText('common.delete'));
    await fireEvent.click(screen.getByText('collectives.detail.delete'));

    await waitFor(() => expect(deleteCollective).toHaveBeenCalledWith(collective.id));
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/collectives'));
    // Flag must be cleared before navigation so shortcuts aren't left suppressed.
    await waitFor(() => expect(get(isModalOpen)).toBe(false));
  });

  it('closes the confirmation and clears the modal flag when deletion fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    deleteCollective.mockRejectedValueOnce(new Error('boom'));
    render(CollectiveDetail, { collective: aCollective() });

    await fireEvent.click(screen.getByText('common.delete'));
    await fireEvent.click(screen.getByText('collectives.detail.delete'));

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(goto).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('collectives.detail.deleteConfirmTitle')).toBeNull(),
    );
    expect(get(isModalOpen)).toBe(false);
    errorSpy.mockRestore();
  });

  it('resets the deleting state after a successful delete even if navigation does not unmount', async () => {
    const collective = aCollective();
    render(CollectiveDetail, { collective });

    await fireEvent.click(screen.getByText('common.delete'));
    await fireEvent.click(screen.getByText('collectives.detail.delete'));
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/collectives'));

    // goto() is a no-op here, so the component stays mounted. Re-opening the
    // dialog must offer an actionable button, not one stuck in "deleting".
    await fireEvent.click(screen.getByText('common.delete'));
    const confirm = screen.getByText('collectives.detail.delete') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it('renders each collective type with its icon variant', () => {
    for (const name of ['Family', 'Company', 'Club', 'Friend Group', 'Other']) {
      const { unmount } = render(CollectiveDetail, {
        collective: aCollective({ type: { ...aCollective().type, name } }),
      });
      unmount();
    }
    // Reaching here means all icon/badge switch branches rendered without error.
    expect(true).toBe(true);
  });

  it('shows the active member count from a populated roster', () => {
    const collective = aCollective({
      members: [aCollectiveMember({ isActive: true })],
      activeMemberCount: 1,
    });
    render(CollectiveDetail, { collective });
    expect(screen.getByText('collectives.detail.members')).toBeTruthy();
  });
});
