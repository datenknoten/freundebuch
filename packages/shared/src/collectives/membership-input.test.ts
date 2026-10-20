import { describe, expect, it } from 'vitest';
import { MembershipInputSchema } from './membership-input.js';

const FRIEND_ID = '11111111-1111-4111-8111-111111111111';

const ROLE_ID = '22222222-2222-4222-8222-222222222222';

describe('MembershipInputSchema', () => {
  it('accepts a membership without a joined_date', () => {
    const result = MembershipInputSchema({ friend_id: FRIEND_ID, role_id: ROLE_ID });
    expect(result).toEqual({ friend_id: FRIEND_ID, role_id: ROLE_ID });
  });

  it('accepts an ISO joined_date', () => {
    const result = MembershipInputSchema({
      friend_id: FRIEND_ID,
      role_id: ROLE_ID,
      joined_date: '2020-03-01',
    });
    expect(result).toEqual({ friend_id: FRIEND_ID, role_id: ROLE_ID, joined_date: '2020-03-01' });
  });

  it('accepts null to leave the date unset', () => {
    const result = MembershipInputSchema({
      friend_id: FRIEND_ID,
      role_id: ROLE_ID,
      joined_date: null,
    });
    expect(result).toEqual({ friend_id: FRIEND_ID, role_id: ROLE_ID, joined_date: null });
  });

  it('rejects an empty joined_date instead of forwarding it to the date column', () => {
    const result = MembershipInputSchema({
      friend_id: FRIEND_ID,
      role_id: ROLE_ID,
      joined_date: '',
    });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects a non-ISO joined_date', () => {
    const result = MembershipInputSchema({
      friend_id: FRIEND_ID,
      role_id: ROLE_ID,
      joined_date: '01/03/2020',
    });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });
});
