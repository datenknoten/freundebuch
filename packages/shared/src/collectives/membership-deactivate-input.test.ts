import { describe, expect, it } from 'vitest';
import { MembershipDeactivateInputSchema } from './membership-deactivate-input.js';

describe('MembershipDeactivateSchema', () => {
  it('accepts an ISO inactive_date with a reason', () => {
    const result = MembershipDeactivateInputSchema({
      inactive_date: '2024-12-31',
      reason: 'moved',
    });
    expect(result).toEqual({ inactive_date: '2024-12-31', reason: 'moved' });
  });

  it('accepts an empty payload', () => {
    const result = MembershipDeactivateInputSchema({});
    expect(result).toEqual({});
  });

  it('rejects an empty inactive_date instead of forwarding it to the date column', () => {
    const result = MembershipDeactivateInputSchema({ inactive_date: '' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects a non-ISO inactive_date', () => {
    const result = MembershipDeactivateInputSchema({ inactive_date: '31.12.2024' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });
});
