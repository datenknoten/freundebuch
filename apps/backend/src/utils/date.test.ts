import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateOnly } from './date.js';

// Node re-reads process.env.TZ, so stubbing it genuinely moves the process
// timezone. This matters: CI runs in UTC, where the bug this function exists to
// prevent is invisible. Without forcing a non-UTC zone these tests would pass
// against the broken `toISOString().split('T')[0]` implementation.
function inTimezone<T>(tz: string, fn: () => T): T {
  vi.stubEnv('TZ', tz);
  return fn();
}

describe('formatDateOnly', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('timezone independence', () => {
    // pg hands us a `date` column as local midnight, so that is what these
    // construct. The stored calendar day must survive formatting.
    it.each([
      { tz: 'UTC', label: 'at UTC' },
      { tz: 'Europe/Berlin', label: 'ahead of UTC (+2)' },
      { tz: 'Pacific/Kiritimati', label: 'far ahead of UTC (+14)' },
      { tz: 'America/Los_Angeles', label: 'behind UTC (-7)' },
      { tz: 'Asia/Kolkata', label: 'on a half-hour offset (+5:30)' },
    ])('returns the stored day $label', ({ tz }) => {
      const stored = inTimezone(tz, () => new Date(2024, 6, 1));

      expect(formatDateOnly(stored)).toBe('2024-07-01');
    });

    it('does not roll a new-year boundary backwards', () => {
      const stored = inTimezone('Pacific/Kiritimati', () => new Date(2025, 0, 1));

      expect(formatDateOnly(stored)).toBe('2025-01-01');
    });
  });

  describe('formatting', () => {
    it('zero-pads single-digit months and days', () => {
      expect(formatDateOnly(new Date(2024, 0, 5))).toBe('2024-01-05');
    });

    it('passes a string through untouched', () => {
      expect(formatDateOnly('2024-07-01')).toBe('2024-07-01');
    });
  });

  describe('absent values', () => {
    it.each([null, undefined])('maps %s to undefined', (value) => {
      expect(formatDateOnly(value)).toBeUndefined();
    });
  });
});
