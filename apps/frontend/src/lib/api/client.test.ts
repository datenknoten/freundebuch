import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted so the mock store is available when vi.mock factory runs (hoisted above imports)
const { mockAuthStore } = vi.hoisted(() => {
  // Inline a minimal writable store to avoid importing svelte/store in hoisted scope
  function writable<T>(initial: T) {
    let value = initial;
    const subscribers = new Set<(v: T) => void>();
    return {
      set(v: T) {
        value = v;
        for (const fn of subscribers) fn(v);
      },
      subscribe(fn: (v: T) => void) {
        fn(value);
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
    };
  }
  return { mockAuthStore: writable<{ accessToken: string | null }>({ accessToken: null }) };
});

vi.mock('../stores/auth.js', () => ({
  auth: mockAuthStore,
}));

vi.mock('$shared', () => ({}));

import { ApiError, apiRequest } from './client.js';

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
    mockAuthStore.set({ accessToken: null });
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

  it('includes Authorization header when token is set', async () => {
    mockAuthStore.set({ accessToken: 'my-token' });

    await apiRequest('/api/test');

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });

  it('omits Authorization header when no token', async () => {
    await apiRequest('/api/test');

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('omits Authorization header when config.auth is false', async () => {
    mockAuthStore.set({ accessToken: 'my-token' });

    await apiRequest('/api/auth/login', {}, { auth: false });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
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
});
