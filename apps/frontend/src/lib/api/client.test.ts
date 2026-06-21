import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$shared', () => ({}));

import {
  abandonSessionExpired,
  resolveSessionExpired,
  sessionExpired,
  setHasSession,
} from '../stores/session.js';
import { ApiError, apiRequest } from './client.js';

function response401() {
  return {
    ok: false,
    status: 401,
    json: () => Promise.resolve({ error: 'Unauthorized' }),
  } as unknown as Response;
}

describe('ApiError', () => {
  it('has correct properties', () => {
    const err = new ApiError(404, 'Not found', 'NOT_FOUND', { field: 'id' });
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.details).toEqual({ field: 'id' });
  });

  it('has name set to ApiError', () => {
    const err = new ApiError(500, 'Server error');
    expect(err.name).toBe('ApiError');
  });

  it('extends Error', () => {
    const err = new ApiError(400, 'Bad request');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs the correct URL', async () => {
    await apiRequest('/api/friends');

    expect(fetch).toHaveBeenCalledWith('/api/friends', expect.objectContaining({}));
  });

  it('parses JSON response on success', async () => {
    const result = await apiRequest('/api/test');
    expect(result).toEqual({ success: true });
  });

  it('sets Content-Type to application/json for non-FormData body', async () => {
    await apiRequest('/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('omits Content-Type for FormData body', async () => {
    const formData = new FormData();
    formData.append('file', 'data');

    await apiRequest('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('always includes credentials: include', async () => {
    await apiRequest('/api/test');

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('throws ApiError with JSON error body on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: 'Validation failed', code: 'VALIDATION_ERROR' }),
    } as unknown as Response);

    await expect(apiRequest('/api/test')).rejects.toMatchObject({
      statusCode: 422,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws ApiError with fallback message when response is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response);

    await expect(apiRequest('/api/test')).rejects.toMatchObject({
      statusCode: 500,
      message: 'An unknown error occurred',
    });
  });

  describe('401 session expiry', () => {
    afterEach(() => {
      // Release any request still parked on the prompt, then reset state.
      abandonSessionExpired();
      setHasSession(false);
    });

    it('prompts re-login and rejects when the user logs out', async () => {
      setHasSession(true);
      sessionExpired.set(false);
      vi.mocked(fetch).mockResolvedValue(response401());

      const pending = apiRequest('/api/test');
      // The prompt is shown while the request is parked awaiting re-auth.
      await vi.waitFor(() => expect(get(sessionExpired)).toBe(true));

      // User logs out -> the parked request rejects with the original 401.
      abandonSessionExpired();
      await expect(pending).rejects.toMatchObject({ statusCode: 401 });
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('replays the original request after the user re-authenticates', async () => {
      setHasSession(true);
      sessionExpired.set(false);
      vi.mocked(fetch)
        .mockResolvedValueOnce(response401())
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ replayed: true }),
        } as unknown as Response);

      const pending = apiRequest('/api/test');
      await vi.waitFor(() => expect(get(sessionExpired)).toBe(true));

      // Re-auth succeeds -> the request is replayed and resolves normally.
      resolveSessionExpired();
      await expect(pending).resolves.toEqual({ replayed: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('does not prompt on 401 when unauthenticated', async () => {
      setHasSession(false);
      sessionExpired.set(false);
      vi.mocked(fetch).mockResolvedValue(response401());

      await expect(apiRequest('/api/test')).rejects.toMatchObject({ statusCode: 401 });
      expect(get(sessionExpired)).toBe(false);
    });
  });
});
