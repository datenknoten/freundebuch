import { describe, expect, it, vi } from 'vitest';

// Mock the auth API module to provide ApiError without triggering the full auth store chain
vi.mock('../api/auth.js', () => {
  class ApiError extends Error {
    statusCode: number;
    code?: string;
    details?: unknown;
    constructor(statusCode: number, message: string, code?: string, details?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
    }
  }
  return { ApiError };
});

import { storeAction } from './storeAction.js';

// Re-import the mocked ApiError for instanceof checks
const { ApiError } = await import('../api/auth.js');

interface TestState {
  isLoading: boolean;
  error: string | null;
  data: string | null;
}

function createMockUpdate() {
  const states: TestState[] = [];
  const update = (fn: (state: TestState) => TestState) => {
    const current =
      states.length > 0 ? states[states.length - 1] : { isLoading: false, error: null, data: null };
    states.push(fn(current));
  };
  return { update, states };
}

describe('storeAction', () => {
  it('sets isLoading to true before the API call', async () => {
    const { update, states } = createMockUpdate();
    const apiFn = vi.fn().mockResolvedValue('result');

    await storeAction(update, apiFn, () => ({}), 'fallback');

    expect(states[0].isLoading).toBe(true);
    expect(states[0].error).toBeNull();
  });

  it('sets isLoading to false after success', async () => {
    const { update, states } = createMockUpdate();
    const apiFn = vi.fn().mockResolvedValue('result');

    await storeAction(update, apiFn, () => ({}), 'fallback');

    const finalState = states[states.length - 1];
    expect(finalState.isLoading).toBe(false);
    expect(finalState.error).toBeNull();
  });

  it('calls onSuccess and merges the result into state', async () => {
    const { update, states } = createMockUpdate();
    const apiFn = vi.fn().mockResolvedValue('new-data');

    await storeAction(update, apiFn, (_state, result) => ({ data: result as string }), 'fallback');

    const finalState = states[states.length - 1];
    expect(finalState.data).toBe('new-data');
  });

  it('returns the API result', async () => {
    const { update } = createMockUpdate();
    const apiFn = vi.fn().mockResolvedValue({ id: 42 });

    const result = await storeAction(update, apiFn, () => ({}), 'fallback');

    expect(result).toEqual({ id: 42 });
  });

  it('uses error.message for ApiError', async () => {
    const { update, states } = createMockUpdate();
    const apiError = new ApiError(400, 'Bad request');
    const apiFn = vi.fn().mockRejectedValue(apiError);

    await expect(storeAction(update, apiFn, () => ({}), 'fallback')).rejects.toThrow(apiError);

    const finalState = states[states.length - 1];
    expect(finalState.error).toBe('Bad request');
    expect(finalState.isLoading).toBe(false);
  });

  it('uses fallbackError for unknown errors', async () => {
    const { update, states } = createMockUpdate();
    const apiFn = vi.fn().mockRejectedValue(new Error('random'));

    await expect(storeAction(update, apiFn, () => ({}), 'Something went wrong')).rejects.toThrow();

    const finalState = states[states.length - 1];
    expect(finalState.error).toBe('Something went wrong');
  });

  it('calls onError callback and merges its result on error', async () => {
    const { update, states } = createMockUpdate();
    const apiFn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(
      storeAction(
        update,
        apiFn,
        () => ({}),
        'fallback',
        () => ({ data: null }),
      ),
    ).rejects.toThrow();

    const finalState = states[states.length - 1];
    expect(finalState.data).toBeNull();
    expect(finalState.error).toBe('fallback');
  });

  it('re-throws the original error', async () => {
    const { update } = createMockUpdate();
    const originalError = new Error('original');
    const apiFn = vi.fn().mockRejectedValue(originalError);

    await expect(storeAction(update, apiFn, () => ({}), 'fallback')).rejects.toBe(originalError);
  });
});
