import { describe, expect, it } from 'vitest';
import { MembershipUpdateInputSchema } from './membership-update-input.js';

describe('MembershipUpdateSchema', () => {
  it('accepts an ISO joined_date', () => {
    const result = MembershipUpdateInputSchema({ joined_date: '2020-03-01' });
    expect(result).toEqual({ joined_date: '2020-03-01' });
  });

  it('accepts null to clear the date', () => {
    const result = MembershipUpdateInputSchema({ joined_date: null });
    expect(result).toEqual({ joined_date: null });
  });

  it('rejects an empty joined_date instead of forwarding it to the date column', () => {
    const result = MembershipUpdateInputSchema({ joined_date: '' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects a non-ISO joined_date', () => {
    const result = MembershipUpdateInputSchema({ joined_date: 'yesterday' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });
});
