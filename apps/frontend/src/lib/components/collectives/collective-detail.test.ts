import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aCollective, aCollectiveMember } from '$lib/test/fixtures.js';
import { fireEvent, screen, waitFor, within } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import type { CollectiveResponse } from '$shared';
import CollectiveDetail from './CollectiveDetail.svelte';

vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

function createContext() {
  const context = createTestAppContext();
  const contacts = context.api.collectiveContacts;
  // The sub-resource sections load their items on mount.
  vi.spyOn(contacts, 'listPhones').mockResolvedValue([]);
  vi.spyOn(contacts, 'listEmails').mockResolvedValue([]);
  vi.spyOn(contacts, 'listAddresses').mockResolvedValue([]);
  vi.spyOn(contacts, 'listUrls').mockResolvedValue([]);
  vi.spyOn(context.api.collectives, 'listCollectiveCircles').mockResolvedValue([]);
  const deleteCollective = vi
    .spyOn(context.stores.collectives, 'deleteCollective')
    .mockResolvedValue(undefined);
  return { context, deleteCollective, isModalOpen: context.stores.overlay.isAnyOpen };
}

function setup(props: { collective: CollectiveResponse; onEdit?: () => void }) {
  const fakes = createContext();
  const view = renderWithContext(CollectiveDetail, { props, context: fakes.context });
  return { ...fakes, view };
}

describe('CollectiveDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('header', () => {
    it('renders the name, type badge and notes', () => {
      setup({ collective: aCollective({ name: 'Book Club', notes: 'Meets monthly' }) });

      expect(screen.getByText('Book Club')).toBeTruthy();
      expect(screen.getByText('Meets monthly')).toBeTruthy();
      expect(screen.getByText('collectives.detail.notes')).toBeTruthy();
    });

    it('renders @-mention links in notes as in-app anchors', () => {
      setup({ collective: aCollective({ notes: 'Founded by [Anja](/friends/abc-123)' }) });

      const link = screen.getByRole('link', { name: 'Anja' });
      expect(link.getAttribute('href')).toBe('/friends/abc-123');
      // No target: SvelteKit's client router must intercept the click.
      expect(link.getAttribute('target')).toBeNull();
    });

    it('renders a formatted address when one is present', () => {
      setup({
        collective: aCollective({
          address: {
            streetLine1: '1 Main St',
            streetLine2: null,
            city: 'Berlin',
            stateProvince: null,
            postalCode: '10115',
            country: 'DE',
          },
        }),
      });

      expect(screen.getByText('1 Main St, 10115 Berlin, Germany')).toBeTruthy();
    });

    it('renders every collective type with its icon variant', () => {
      for (const name of ['Family', 'Company', 'Club', 'Friend Group', 'Other']) {
        const { view } = setup({
          collective: aCollective({ type: { ...aCollective().type, name } }),
        });
        expect(view.container.querySelector('svg')).not.toBeNull();
        view.unmount();
      }
    });

    it('shows the members section for a populated roster', () => {
      setup({
        collective: aCollective({
          members: [aCollectiveMember({ isActive: true })],
          activeMemberCount: 1,
        }),
      });

      expect(screen.getByText('collectives.detail.members')).toBeTruthy();
    });

    it('invokes onEdit from the edit button', async () => {
      const onEdit = vi.fn();
      setup({ collective: aCollective(), onEdit });

      await fireEvent.click(screen.getByText('common.edit'));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleting the collective', () => {
    it('opens the confirmation and flags the modal state', async () => {
      const { isModalOpen } = setup({ collective: aCollective() });

      expect(get(isModalOpen)).toBe(false);
      await fireEvent.click(screen.getByText('common.delete'));
      expect(screen.getByText('collectives.detail.deleteConfirmTitle')).toBeTruthy();
      expect(get(isModalOpen)).toBe(true);
    });

    it('clears the modal state when the deletion is cancelled', async () => {
      const { isModalOpen } = setup({ collective: aCollective() });

      await fireEvent.click(screen.getByText('common.delete'));
      await fireEvent.click(screen.getByText('common.cancel'));
      expect(get(isModalOpen)).toBe(false);
      expect(screen.queryByText('collectives.detail.deleteConfirmTitle')).toBeNull();
    });

    it('deletes the collective and navigates away on confirm', async () => {
      const collective = aCollective();
      const { deleteCollective, isModalOpen } = setup({ collective });

      await fireEvent.click(screen.getByText('common.delete'));
      await fireEvent.click(within(screen.getByRole('dialog')).getByText('common.delete'));

      await waitFor(() => expect(deleteCollective).toHaveBeenCalledWith(collective.id));
      await waitFor(() => expect(goto).toHaveBeenCalledWith('/collectives'));
      // The flag must clear before navigation so shortcuts aren't left suppressed.
      await waitFor(() => expect(get(isModalOpen)).toBe(false));
    });

    it('keeps the confirmation open and shows the reason when deletion fails', async () => {
      const { deleteCollective, isModalOpen } = setup({ collective: aCollective() });
      deleteCollective.mockRejectedValueOnce(new Error('boom'));

      await fireEvent.click(screen.getByText('common.delete'));
      await fireEvent.click(within(screen.getByRole('dialog')).getByText('common.delete'));

      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('boom'));
      expect(goto).not.toHaveBeenCalled();
      expect(screen.getByText('collectives.detail.deleteConfirmTitle')).toBeTruthy();
      expect(get(isModalOpen)).toBe(true);
    });

    it('offers an actionable confirmation again when navigation does not unmount', async () => {
      setup({ collective: aCollective() });

      await fireEvent.click(screen.getByText('common.delete'));
      await fireEvent.click(within(screen.getByRole('dialog')).getByText('common.delete'));
      await waitFor(() => expect(goto).toHaveBeenCalledWith('/collectives'));

      // goto() is a no-op here, so the component stays mounted. Re-opening the
      // dialog must offer an actionable button, not one stuck in "deleting".
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await fireEvent.click(screen.getByText('common.delete'));
      const confirm = within(screen.getByRole('dialog'))
        .getByText('common.delete')
        .closest('button');
      expect(confirm?.disabled).toBe(false);
    });
  });

  describe('adding a detail', () => {
    it('opens a sub-resource add modal from the desktop dropdown', async () => {
      const handler = vi.fn();
      window.addEventListener('shortcut:collective-add-phone', handler);
      try {
        setup({ collective: aCollective() });

        await fireEvent.click(screen.getByText('subresources.common.add'));
        await fireEvent.click(screen.getByText('shortcuts.add.phone'));

        expect(handler).toHaveBeenCalledTimes(1);
      } finally {
        window.removeEventListener('shortcut:collective-add-phone', handler);
      }
    });

    it('reaches the picker through the mobile FAB create menu', async () => {
      const handler = vi.fn();
      window.addEventListener('shortcut:collective-add-email', handler);
      try {
        const { isModalOpen } = setup({ collective: aCollective() });

        await fireEvent.click(screen.getByLabelText('common.createNew'));
        await fireEvent.click(screen.getByText('friendDetail.addDetail'));

        // The create menu closing and the picker opening happen in one update;
        // the modal flag must stay set so global shortcuts remain suppressed.
        expect(get(isModalOpen)).toBe(true);

        await fireEvent.click(screen.getByText('shortcuts.add.email'));

        expect(handler).toHaveBeenCalledTimes(1);
      } finally {
        window.removeEventListener('shortcut:collective-add-email', handler);
      }
    });
  });
});
