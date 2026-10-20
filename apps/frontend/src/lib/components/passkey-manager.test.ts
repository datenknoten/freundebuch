import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import PasskeyManager from './PasskeyManager.svelte';

vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
  getCurrentLanguage: () => 'en',
}));

const A_PASSKEY = {
  id: 'pk-1',
  name: 'YubiKey',
  deviceType: 'singleDevice',
  createdAt: '2026-01-01T00:00:00.000Z',
};

/** Better Auth answers by path; the delete answer is set per test. */
let deleteAnswer: { success: boolean } | { message: string } = { success: true };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function answerBetterAuth(input: RequestInfo | URL) {
  const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost');
  if (url.pathname === '/api/auth/passkey/list-user-passkeys') {
    return json([A_PASSKEY]);
  }
  if (url.pathname === '/api/auth/passkey/delete-passkey') {
    return 'success' in deleteAnswer ? json(deleteAnswer) : json(deleteAnswer, 400);
  }
  return json({}, 404);
}

const fetchMock = vi.fn(answerBetterAuth);

function deleteRequests() {
  return fetchMock.mock.calls.filter(([input]) =>
    String(input instanceof Request ? input.url : input).includes('/passkey/delete-passkey'),
  );
}

async function openDeleteConfirmation() {
  renderWithContext(PasskeyManager, { props: {} });
  await waitFor(() => expect(screen.getByText('YubiKey')).toBeTruthy());
  await fireEvent.click(screen.getByText('common.delete'));
  return screen.getByRole('dialog');
}

beforeEach(() => {
  vi.clearAllMocks();
  deleteAnswer = { success: true };
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PasskeyManager', () => {
  it('deletes a passkey only after the confirmation dialog', async () => {
    const dialog = await openDeleteConfirmation();

    expect(within(dialog).getByText('profile.passkeys.deleteTitle')).toBeTruthy();
    expect(within(dialog).getByText('YubiKey')).toBeTruthy();
    expect(deleteRequests()).toEqual([]);

    await fireEvent.click(within(dialog).getByText('common.delete'));
    await waitFor(() => expect(deleteRequests()).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the passkey when the dialog is cancelled', async () => {
    const dialog = await openDeleteConfirmation();

    await fireEvent.click(within(dialog).getByText('common.cancel'));
    expect(deleteRequests()).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the dialog open and shows the reason when deletion fails', async () => {
    deleteAnswer = { message: 'still in use' };
    const dialog = await openDeleteConfirmation();

    await fireEvent.click(within(dialog).getByText('common.delete'));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('still in use'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
