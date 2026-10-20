import { ValidationError } from '@datenknoten/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApiClient } from '$lib/test/api-test-client.js';
import { aPhone } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { FriendDetailsApi } from './friend-details.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function sentRequest() {
  const [url, init] = itemAt(fetchMock.mock.calls, 0);
  return { url: String(url), body: init?.body };
}

function sentJson() {
  return JSON.parse(String(sentRequest().body));
}

function createFriendDetailsApi() {
  return new FriendDetailsApi({ client: createTestApiClient() });
}

describe('FriendDetailsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('addPhone', () => {
    it('returns the created phone', async () => {
      const phone = aPhone({ phoneNumber: '+49 30 1234567' });
      fetchMock.mockResolvedValueOnce(jsonResponse(phone, 201));

      await expect(
        createFriendDetailsApi().addPhone('f-1', {
          phoneNumber: '+49 30 1234567',
          phoneType: 'mobile',
        }),
      ).resolves.toEqual(phone);
    });

    it('sends the phone as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aPhone(), 201));

      await createFriendDetailsApi().addPhone('f-1', {
        phoneNumber: '+49 30 1234567',
        phoneType: 'work',
        label: 'Office',
        isPrimary: true,
      });

      expect(sentJson()).toEqual({
        phone_number: '+49 30 1234567',
        phone_type: 'work',
        label: 'Office',
        is_primary: true,
      });
    });

    it('throws ValidationError when the phone lacks its number', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'p-1' }, 201));

      await expect(
        createFriendDetailsApi().addPhone('f-1', {
          phoneNumber: '+49 30 1234567',
          phoneType: 'mobile',
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('addProfessionalHistory', () => {
    it('sends the employment as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 201));

      await createFriendDetailsApi()
        .addProfessionalHistory('f-1', {
          jobTitle: 'Engineer',
          fromMonth: 3,
          fromYear: 2020,
          toMonth: null,
          toYear: null,
          isPrimary: true,
        })
        .catch(() => undefined);

      expect(sentJson()).toEqual({
        job_title: 'Engineer',
        from_month: 3,
        from_year: 2020,
        to_month: null,
        to_year: null,
        is_primary: true,
      });
    });
  });

  describe('addRelationship', () => {
    it('sends the related friend and type as snake_case', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 201));

      await createFriendDetailsApi()
        .addRelationship('f-1', { relatedFriendId: 'f-2', relationshipTypeId: 'sibling' })
        .catch(() => undefined);

      expect(sentJson()).toEqual({ related_friend_id: 'f-2', relationship_type_id: 'sibling' });
    });
  });

  describe('deleteEmail', () => {
    it('throws ValidationError when the confirmation is malformed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await expect(createFriendDetailsApi().deleteEmail('f-1', 'e-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });
});
