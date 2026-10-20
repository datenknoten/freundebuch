import { type ComponentProps, createRawSnippet, tick } from 'svelte';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import Modal from './Modal.svelte';

vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const body = createRawSnippet(() => ({ render: () => '<p>Body</p>' }));

function noop() {
  return undefined;
}

function renderModal(
  props: Partial<ComponentProps<typeof Modal>>,
  context = createTestAppContext(),
) {
  const rendered = renderWithContext(Modal, {
    props: { title: 'Edit email', onClose: noop, children: body, ...props },
    context,
  });
  return { ...rendered, context };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Modal', () => {
  describe('when opened', () => {
    it('opens the native dialog and titles it', () => {
      renderModal({});

      const dialog = screen.getByRole('dialog') as HTMLDialogElement;
      expect(dialog.open).toBe(true);
      expect(dialog.getAttribute('aria-labelledby')).toBe(
        screen.getByText('Edit email').getAttribute('id'),
      );
    });

    it('closes on Escape', async () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('when not closable', () => {
    it('swallows Escape when not closable', async () => {
      const onClose = vi.fn();
      renderModal({ title: 'Session expired', closable: false, onClose });

      const cancel = new Event('cancel', { cancelable: true });
      await fireEvent(screen.getByRole('dialog'), cancel);

      expect(onClose).not.toHaveBeenCalled();
      expect(cancel.defaultPrevented).toBe(true);
    });

    it('hides the close button when not closable', () => {
      renderModal({ title: 'Session expired', closable: false });

      expect(screen.queryByRole('button', { name: 'common.close' })).toBeNull();
    });
  });

  describe('overlay registration', () => {
    it('suppresses keyboard shortcuts while mounted', () => {
      const { context } = renderModal({});
      expect(get(context.stores.overlay.isAnyOpen)).toBe(true);

      cleanup();
      expect(get(context.stores.overlay.isAnyOpen)).toBe(false);
    });

    // The blocking session-expiry dialog mounts on top of whatever is already
    // open; if the flag were a boolean, the first unmount would re-arm the
    // global shortcuts while the other dialog still covers the page.
    it('keeps shortcuts suppressed until the last of two stacked dialogs closes', () => {
      const first = renderModal({});
      const second = renderModal({ title: 'Session expired', closable: false }, first.context);
      const { isAnyOpen } = first.context.stores.overlay;
      expect(get(isAnyOpen)).toBe(true);

      second.unmount();
      expect(get(isAnyOpen)).toBe(true);

      first.unmount();
      expect(get(isAnyOpen)).toBe(false);
    });
  });

  describe('when the platform closes the dialog', () => {
    // Chrome's close-watcher anti-abuse rule makes `cancel` non-cancelable on a
    // second Escape without user activation, so the dialog can close without
    // `cancel` ever reaching us — as can any script close().
    it('reports a platform close that skipped cancel', async () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      const dialog = screen.getByRole('dialog') as HTMLDialogElement;
      dialog.close();

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('re-opens itself when the platform closes a non-closable dialog', async () => {
      const onClose = vi.fn();
      renderModal({ title: 'Session expired', closable: false, onClose });

      const dialog = screen.getByRole('dialog') as HTMLDialogElement;
      dialog.close();

      await waitFor(() => expect(dialog.open).toBe(true));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('on unmount', () => {
    // The platform queues `close` as a task, so the event from the teardown's own
    // close() lands after the component is gone; onClose must not fire then.
    it('does not report the teardown close as a platform close', async () => {
      const onClose = vi.fn();
      const { unmount, context } = renderModal({ onClose });

      unmount();
      await tick();
      await tick();

      expect(onClose).not.toHaveBeenCalled();
      expect(get(context.stores.overlay.isAnyOpen)).toBe(false);
    });

    // Svelte detaches the dialog before the effect teardown runs, so the
    // platform's own "restore focus to the opener" step never fires.
    it('restores focus to the element focused before opening', async () => {
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();

      const { unmount } = renderModal({ onClose: vi.fn() });
      // Stand in for showModal()'s focus move, which jsdom's shim does not do.
      (screen.getByLabelText('common.close') as HTMLButtonElement).focus();

      unmount();
      await tick();

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });
  });
});
