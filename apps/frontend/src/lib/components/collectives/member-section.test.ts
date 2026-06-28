import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isModalOpen } from '$lib/stores/ui';
import { aCollective, aCollectiveMember, fireEvent, render, screen, waitFor } from '$lib/test';
import MemberSection from './member-section.svelte';

vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const addMember = vi.fn().mockResolvedValue(undefined);
const deactivateMember = vi.fn().mockResolvedValue(undefined);
const reactivateMember = vi.fn().mockResolvedValue(undefined);
const removeMember = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/stores/collectives', () => ({
  collectives: {
    addMember: (...args: unknown[]) => addMember(...args),
    deactivateMember: (...args: unknown[]) => deactivateMember(...args),
    reactivateMember: (...args: unknown[]) => reactivateMember(...args),
    removeMember: (...args: unknown[]) => removeMember(...args),
  },
  // AddMemberForm imports this from the same module.
  previewMemberRelationships: vi.fn().mockResolvedValue({ relationships: [] }),
}));

function aCollectiveWithMembers() {
  const active = aCollectiveMember({ isActive: true });
  const inactive = aCollectiveMember({ isActive: false, inactiveDate: '2026-01-01' });
  return {
    collective: aCollective({ members: [active, inactive], activeMemberCount: 1 }),
    active,
    inactive,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  isModalOpen.set(false);
});

describe('MemberSection', () => {
  it('renders the active and inactive members', () => {
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    expect(screen.getAllByText('Test Friend').length).toBe(2);
    expect(screen.getByText('collectives.detail.members')).toBeTruthy();
  });

  it('opens the deactivate modal and confirms deactivation through the store', async () => {
    const { collective, active } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
    expect(await screen.findByText('collectives.deactivate.title')).toBeTruthy();

    await fireEvent.click(screen.getByText('collectives.deactivate.confirm'));
    await waitFor(() => expect(deactivateMember).toHaveBeenCalledTimes(1));
    expect(deactivateMember).toHaveBeenCalledWith(
      collective.id,
      active.id,
      expect.objectContaining({ reason: null }),
    );
  });

  it('flags the global modal state while the deactivate dialog is open and clears it on confirm', async () => {
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    expect(get(isModalOpen)).toBe(false);
    await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
    expect(get(isModalOpen)).toBe(true);

    await fireEvent.click(screen.getByText('collectives.deactivate.confirm'));
    await waitFor(() => expect(deactivateMember).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(get(isModalOpen)).toBe(false));
  });

  it('clears the modal state when the deactivate dialog is cancelled', async () => {
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
    expect(get(isModalOpen)).toBe(true);

    await fireEvent.click(screen.getByText('collectives.form.cancel'));
    expect(get(isModalOpen)).toBe(false);
    expect(deactivateMember).not.toHaveBeenCalled();
  });

  it('keeps the deactivate dialog open and logs when the store rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    deactivateMember.mockRejectedValueOnce(new Error('boom'));
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
    await fireEvent.click(screen.getByText('collectives.deactivate.confirm'));

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    // Modal stays open so the user can retry.
    expect(screen.queryByText('collectives.deactivate.title')).toBeTruthy();
    expect(get(isModalOpen)).toBe(true);
    errorSpy.mockRestore();
  });

  it('logs when reactivation rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reactivateMember.mockRejectedValueOnce(new Error('boom'));
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getByTitle('collectives.reactivateMember'));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    errorSpy.mockRestore();
  });

  it('logs when removal rejects', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    removeMember.mockRejectedValueOnce(new Error('boom'));
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getAllByTitle('collectives.removeMember')[0]);
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    confirmSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('reactivates an inactive member through the store', async () => {
    const { collective, inactive } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getByTitle('collectives.reactivateMember'));
    await waitFor(() => expect(reactivateMember).toHaveBeenCalledWith(collective.id, inactive.id));
  });

  it('removes a member after the confirm prompt', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { collective, active } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getAllByTitle('collectives.removeMember')[0]);
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith(collective.id, active.id));
    confirmSpy.mockRestore();
  });

  it('does not remove a member when the confirm prompt is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getAllByTitle('collectives.removeMember')[0]);
    expect(removeMember).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('opens the add-member modal', async () => {
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getByText('collectives.addMember.button'));
    expect(await screen.findByText('collectives.addMember.title')).toBeTruthy();
  });

  it('closes an open modal and clears the global flag when the collective changes', async () => {
    const { collective } = aCollectiveWithMembers();
    const other = aCollective({
      id: 'other-collective',
      members: [aCollectiveMember({ isActive: true })],
      activeMemberCount: 1,
    });
    const { rerender } = render(MemberSection, { collective });

    await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
    expect(get(isModalOpen)).toBe(true);
    expect(screen.queryByText('collectives.deactivate.title')).toBeTruthy();

    // Route swaps the collective without unmounting; the stale modal must close.
    await rerender({ collective: other });

    await waitFor(() => expect(screen.queryByText('collectives.deactivate.title')).toBeNull());
    expect(get(isModalOpen)).toBe(false);
  });

  it('does not nest the add-member form inside the modal form (valid HTML)', async () => {
    const { collective } = aCollectiveWithMembers();
    render(MemberSection, { collective });

    await fireEvent.click(screen.getByText('collectives.addMember.button'));
    await screen.findByText('collectives.addMember.title');

    // DetailEditModal renders with asForm={false} here, so AddMemberForm's own
    // <form> is the only one — nested forms are invalid HTML.
    expect(document.querySelectorAll('form')).toHaveLength(1);
  });
});
