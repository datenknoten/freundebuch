import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aCollective, aCollectiveMember } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { fireEvent, screen, waitFor, within } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import type { CollectiveResponse } from '$shared';
import MemberSection from './MemberSection.svelte';

vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
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

function setup(collective: CollectiveResponse) {
  const context = createTestAppContext();
  const collectives = context.stores.collectives;
  const fakes = {
    deactivateMember: vi
      .spyOn(collectives, 'deactivateMember')
      .mockResolvedValue(aCollectiveMember({ isActive: false })),
    reactivateMember: vi
      .spyOn(collectives, 'reactivateMember')
      .mockResolvedValue(aCollectiveMember()),
    removeMember: vi.spyOn(collectives, 'removeMember').mockResolvedValue(undefined),
    logError: vi.spyOn(context.logger, 'error'),
  };
  const view = renderWithContext(MemberSection, { props: { collective }, context });
  return { ...fakes, view, isModalOpen: context.stores.overlay.isAnyOpen };
}

describe('MemberSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('roster', () => {
    it('renders the active and inactive members', () => {
      setup(aCollectiveWithMembers().collective);

      expect(screen.getAllByText('Test Friend').length).toBe(2);
      expect(screen.getByText('collectives.detail.members')).toBeTruthy();
    });
  });

  describe('deactivating a member', () => {
    it('confirms the deactivation through the store', async () => {
      const { collective, active } = aCollectiveWithMembers();
      const { deactivateMember } = setup(collective);

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

    it('flags the modal state while the dialog is open and clears it on confirm', async () => {
      const { deactivateMember, isModalOpen } = setup(aCollectiveWithMembers().collective);

      expect(get(isModalOpen)).toBe(false);
      await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
      expect(get(isModalOpen)).toBe(true);

      await fireEvent.click(screen.getByText('collectives.deactivate.confirm'));
      await waitFor(() => expect(deactivateMember).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(get(isModalOpen)).toBe(false));
    });

    it('clears the modal state when the dialog is cancelled', async () => {
      const { deactivateMember, isModalOpen } = setup(aCollectiveWithMembers().collective);

      await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
      expect(get(isModalOpen)).toBe(true);

      await fireEvent.click(screen.getByText('collectives.form.cancel'));
      expect(get(isModalOpen)).toBe(false);
      expect(deactivateMember).not.toHaveBeenCalled();
    });

    it('keeps the dialog open and logs the failure when the store rejects', async () => {
      const { deactivateMember, logError, isModalOpen } = setup(
        aCollectiveWithMembers().collective,
      );
      deactivateMember.mockRejectedValueOnce(new Error('boom'));

      await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
      await fireEvent.click(screen.getByText('collectives.deactivate.confirm'));

      await waitFor(() => expect(logError).toHaveBeenCalled());
      expect(screen.queryByText('collectives.deactivate.title')).toBeTruthy();
      expect(get(isModalOpen)).toBe(true);
    });

    it('closes an open dialog and clears the modal state when the collective changes', async () => {
      const other = aCollective({
        id: 'other-collective',
        members: [aCollectiveMember({ isActive: true })],
        activeMemberCount: 1,
      });
      const { view, isModalOpen } = setup(aCollectiveWithMembers().collective);

      await fireEvent.click(screen.getByTitle('collectives.deactivateMember'));
      expect(get(isModalOpen)).toBe(true);
      expect(screen.queryByText('collectives.deactivate.title')).toBeTruthy();

      // The route swaps the collective without unmounting; the stale dialog must close.
      await view.rerender({ collective: other });

      await waitFor(() => expect(screen.queryByText('collectives.deactivate.title')).toBeNull());
      expect(get(isModalOpen)).toBe(false);
    });
  });

  describe('reactivating a member', () => {
    it('reactivates the inactive member through the store', async () => {
      const { collective, inactive } = aCollectiveWithMembers();
      const { reactivateMember } = setup(collective);

      await fireEvent.click(screen.getByTitle('collectives.reactivateMember'));
      await waitFor(() =>
        expect(reactivateMember).toHaveBeenCalledWith(collective.id, inactive.id),
      );
    });

    it('logs the failure when the store rejects', async () => {
      const { reactivateMember, logError } = setup(aCollectiveWithMembers().collective);
      reactivateMember.mockRejectedValueOnce(new Error('boom'));

      await fireEvent.click(screen.getByTitle('collectives.reactivateMember'));
      await waitFor(() => expect(logError).toHaveBeenCalled());
    });
  });

  describe('removing a member', () => {
    it('removes the member after confirming in the dialog', async () => {
      const { collective, active } = aCollectiveWithMembers();
      const { removeMember } = setup(collective);

      await fireEvent.click(itemAt(screen.getAllByTitle('collectives.removeMember'), 0));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(active.contact.displayName)).toBeTruthy();

      await fireEvent.click(within(dialog).getByText('common.remove'));
      await waitFor(() => expect(removeMember).toHaveBeenCalledWith(collective.id, active.id));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('keeps the dialog open and shows the reason when the store rejects', async () => {
      const { removeMember } = setup(aCollectiveWithMembers().collective);
      removeMember.mockRejectedValueOnce(new Error('boom'));

      await fireEvent.click(itemAt(screen.getAllByTitle('collectives.removeMember'), 0));
      await fireEvent.click(screen.getByText('common.remove'));

      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('boom'));
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('keeps the member when the dialog is cancelled', async () => {
      const { removeMember, isModalOpen } = setup(aCollectiveWithMembers().collective);

      await fireEvent.click(itemAt(screen.getAllByTitle('collectives.removeMember'), 0));
      await fireEvent.click(screen.getByText('common.cancel'));

      expect(removeMember).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(get(isModalOpen)).toBe(false);
    });
  });

  describe('adding a member', () => {
    it('opens the add-member modal', async () => {
      setup(aCollectiveWithMembers().collective);

      await fireEvent.click(screen.getByText('collectives.addMember.button'));
      expect(await screen.findByText('collectives.addMember.title')).toBeTruthy();
    });

    it('renders the add-member form as the only form, since forms must not nest', async () => {
      setup(aCollectiveWithMembers().collective);

      await fireEvent.click(screen.getByText('collectives.addMember.button'));
      await screen.findByText('collectives.addMember.title');

      expect(document.querySelectorAll('form')).toHaveLength(1);
    });
  });
});
