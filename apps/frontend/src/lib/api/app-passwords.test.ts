import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { AppPasswordsApi } from './app-passwords.js';

const AN_APP_PASSWORD = {
  externalId: 'ap-1',
  name: 'CalDAV',
  lastUsedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function stayUnauthenticated() {
  return false;
}

function createClient() {
  return new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
}

function sentRequest() {
  return itemAt(fetchMock.mock.calls, 0);
}

describe('AppPasswordsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listAppPasswords', () => {
    it('returns the app passwords of the response', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([AN_APP_PASSWORD]));

      await expect(
        new AppPasswordsApi({ client: createClient() }).listAppPasswords(),
      ).resolves.toEqual([AN_APP_PASSWORD]);
    });

    it('throws ValidationError when an app password lacks its name', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ externalId: 'ap-1' }]));

      await expect(
        new AppPasswordsApi({ client: createClient() }).listAppPasswords(),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('createAppPassword', () => {
    it('sends the name and returns the one-time password', async () => {
      const created = { ...AN_APP_PASSWORD, password: 'abcd-1234', passwordPrefix: 'abcd1234' };
      fetchMock.mockResolvedValueOnce(jsonResponse(created, 201));

      const result = await new AppPasswordsApi({ client: createClient() }).createAppPassword(
        'Phone',
      );

      expect(JSON.parse(String(sentRequest()[1]?.body))).toEqual({ name: 'Phone' });
      expect(result.password).toBe('abcd-1234');
    });

    it('throws ValidationError when the response lacks the password', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(AN_APP_PASSWORD, 201));

      await expect(
        new AppPasswordsApi({ client: createClient() }).createAppPassword('Phone'),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('revokeAppPassword', () => {
    it('resolves once the backend confirms the revocation', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

      await expect(
        new AppPasswordsApi({ client: createClient() }).revokeAppPassword('ap-1'),
      ).resolves.toBeUndefined();
    });
  });
});
