import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aPhone, aUrl } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { CollectiveContactsApi } from './collective-contacts.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function stayUnauthenticated() {
  return false;
}

function createCollectiveContactsApi() {
  const client = new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
  return new CollectiveContactsApi({ client });
}

function sentBody() {
  return JSON.parse(String(itemAt(fetchMock.mock.calls, 0)[1]?.body));
}

describe('CollectiveContactsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listPhones', () => {
    it('returns the phones of the response', async () => {
      const phones = [aPhone()];
      fetchMock.mockResolvedValueOnce(jsonResponse(phones));

      await expect(createCollectiveContactsApi().listPhones('c-1')).resolves.toEqual(phones);
    });

    it('throws ValidationError when a phone lacks its number', async () => {
      const { phoneNumber: _phoneNumber, ...incomplete } = aPhone();
      fetchMock.mockResolvedValueOnce(jsonResponse([incomplete]));

      await expect(createCollectiveContactsApi().listPhones('c-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('addPhone', () => {
    it('sends the phone as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aPhone(), 201));

      await createCollectiveContactsApi().addPhone('c-1', {
        phoneNumber: '+4930123456',
        phoneType: 'work',
        isPrimary: true,
      });

      expect(sentBody()).toEqual({
        phone_number: '+4930123456',
        phone_type: 'work',
        is_primary: true,
      });
    });
  });

  describe('updateUrl', () => {
    it('sends the URL as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aUrl()));

      await createCollectiveContactsApi().updateUrl('c-1', 'u-1', {
        url: 'https://example.org',
        urlType: 'personal',
      });

      expect(sentBody()).toEqual({ url: 'https://example.org', url_type: 'personal' });
    });
  });

  describe('deleteEmail', () => {
    it('resolves once the backend confirms the deletion', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Email deleted successfully' }));

      await expect(
        createCollectiveContactsApi().deleteEmail('c-1', 'e-1'),
      ).resolves.toBeUndefined();
    });

    it('throws ValidationError when the confirmation is malformed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

      await expect(createCollectiveContactsApi().deleteEmail('c-1', 'e-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });
});
