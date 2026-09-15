import { createRawSnippet, tick } from 'svelte';
import { get } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import { isModalOpen } from '$lib/stores/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '$lib/test';
import Modal from './modal.svelte';

vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

const body = createRawSnippet(() => ({ render: () => '<p>Body</p>' }));

describe('Modal', () => {
  it('opens the native dialog and titles it', () => {
    render(Modal, { title: 'Edit email', onClose: () => undefined, children: body });

    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe(
      screen.getByText('Edit email').getAttribute('id'),
    );
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(Modal, { title: 'Edit email', onClose, children: body });

    await fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('swallows Escape when not closable', async () => {
    const onClose = vi.fn();
    render(Modal, { title: 'Session expired', closable: false, onClose, children: body });

    const cancel = new Event('cancel', { cancelable: true });
    await fireEvent(screen.getByRole('dialog'), cancel);

    expect(onClose).not.toHaveBeenCalled();
    expect(cancel.defaultPrevented).toBe(true);
  });

  it('hides the close button when not closable', () => {
    render(Modal, {
      title: 'Session expired',
      closable: false,
      onClose: () => undefined,
      children: body,
    });

    expect(screen.queryByRole('button', { name: 'common.close' })).toBeNull();
  });

  it('suppresses keyboard shortcuts while mounted', () => {
    render(Modal, { title: 'Edit email', onClose: () => undefined, children: body });
    expect(get(isModalOpen)).toBe(true);

    cleanup();
    expect(get(isModalOpen)).toBe(false);
  });

  // The blocking session-expiry dialog mounts on top of whatever is already
  // open; if the flag were a boolean, the first unmount would re-arm the
  // global shortcuts while the other dialog still covers the page.
  it('keeps shortcuts suppressed until the last of two stacked dialogs closes', () => {
    const first = render(Modal, { title: 'Edit email', onClose: () => undefined, children: body });
    const second = render(Modal, {
      title: 'Session expired',
      closable: false,
      onClose: () => undefined,
      children: body,
    });
    expect(get(isModalOpen)).toBe(true);

    second.unmount();
    expect(get(isModalOpen)).toBe(true);

    first.unmount();
    expect(get(isModalOpen)).toBe(false);
  });

  // Chrome's close-watcher anti-abuse rule makes `cancel` non-cancelable on a
  // second Escape without user activation, so the dialog can close without
  // `cancel` ever reaching us — as can any script close().
  it('reports a platform close that skipped cancel', async () => {
    const onClose = vi.fn();
    render(Modal, { title: 'Edit email', onClose, children: body });

    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    dialog.close();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('re-opens itself when the platform closes a non-closable dialog', async () => {
    const onClose = vi.fn();
    render(Modal, { title: 'Session expired', closable: false, onClose, children: body });

    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    dialog.close();

    await waitFor(() => expect(dialog.open).toBe(true));
    expect(onClose).not.toHaveBeenCalled();
  });

  // The platform queues `close` as a task, so the event from the teardown's own
  // close() lands after the component is gone; onClose must not fire then.
  it('does not report the teardown close as a platform close', async () => {
    const onClose = vi.fn();
    const { unmount } = render(Modal, { title: 'Edit email', onClose, children: body });

    unmount();
    await tick();
    await tick();

    expect(onClose).not.toHaveBeenCalled();
    expect(get(isModalOpen)).toBe(false);
  });

  // Svelte detaches the dialog before the effect teardown runs, so the
  // platform's own "restore focus to the opener" step never fires.
  it('restores focus to the element focused before opening', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(Modal, { title: 'Edit email', onClose: vi.fn(), children: body });
    // Stand in for showModal()'s focus move, which jsdom's shim does not do.
    (screen.getByLabelText('common.close') as HTMLButtonElement).focus();

    unmount();
    await tick();

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
