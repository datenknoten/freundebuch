import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retryWithBackoff } from './retry.js';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the result without retrying when the function succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until the function succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('recovered');

    const promise = retryWithBackoff(fn, { initialDelay: 100 });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('returns undefined (fails silently) after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    const promise = retryWithBackoff(fn, { maxAttempts: 3, initialDelay: 10 });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('invokes onRetry with the attempt number and error, but not after the final failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    const onRetry = vi.fn();

    const promise = retryWithBackoff(fn, { maxAttempts: 3, initialDelay: 10, onRetry });
    await vi.runAllTimersAsync();
    await promise;

    // onRetry fires after attempts 1 and 2, but not after the 3rd (final) attempt.
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
  });

  it('wraps a non-Error throw into an Error for onRetry', async () => {
    const fn = vi.fn().mockRejectedValue('string failure');
    const onRetry = vi.fn();

    const promise = retryWithBackoff(fn, { maxAttempts: 2, initialDelay: 10, onRetry });
    await vi.runAllTimersAsync();
    await promise;

    const [, error] = onRetry.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('string failure');
  });

  it('applies exponential backoff capped at maxDelay', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const delays: number[] = [];
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = retryWithBackoff(fn, {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 4000,
      backoffMultiplier: 2,
    });
    await vi.runAllTimersAsync();
    await promise;

    for (const call of setTimeoutSpy.mock.calls) {
      delays.push(call[1] as number);
    }
    // 1000 -> 2000 -> 4000 -> 4000 (capped); 4 waits for 5 attempts.
    expect(delays).toEqual([1000, 2000, 4000, 4000]);
  });
});
