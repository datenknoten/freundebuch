import { ApiError } from '../api/auth.js';

/**
 * Generic store action wrapper that handles loading/error state boilerplate.
 *
 * Reduces typical store operations from ~25 lines to ~3-5 lines by
 * automatically managing isLoading and error state transitions.
 */
export async function storeAction<S extends { isLoading: boolean; error: string | null }, T>(
  update: (fn: (state: S) => S) => void,
  apiFn: () => Promise<T>,
  onSuccess: (state: S, result: T) => Partial<S>,
  fallbackError: string,
  onError?: (state: S) => Partial<S>,
): Promise<T> {
  update((state) => ({ ...state, isLoading: true, error: null }));

  try {
    const result = await apiFn();

    update((state) => ({
      ...state,
      ...onSuccess(state, result),
      isLoading: false,
      error: null,
    }));

    return result;
  } catch (error) {
    const errorMessage = error instanceof ApiError ? error.message : fallbackError;

    update((state) => ({
      ...state,
      ...(onError?.(state) ?? {}),
      isLoading: false,
      error: errorMessage,
    }));

    throw error;
  }
}
