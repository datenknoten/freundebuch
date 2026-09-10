import { describe, expect, it } from 'vitest';
import {
  MembershipDeactivateSchema,
  MembershipInputSchema,
  MembershipUpdateSchema,
} from './collectives.js';

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

describe('MembershipUpdateSchema', () => {
  it('accepts an ISO joined_date', () => {
    const result = MembershipUpdateSchema({ joined_date: '2020-03-01' });
    expect(result).toEqual({ joined_date: '2020-03-01' });
  });

  it('accepts null to clear the date', () => {
    const result = MembershipUpdateSchema({ joined_date: null });
    expect(result).toEqual({ joined_date: null });
  });

  it('rejects an empty joined_date instead of forwarding it to the date column', () => {
    const result = MembershipUpdateSchema({ joined_date: '' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects a non-ISO joined_date', () => {
    const result = MembershipUpdateSchema({ joined_date: 'yesterday' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });
});

describe('MembershipDeactivateSchema', () => {
  it('accepts an ISO inactive_date with a reason', () => {
    const result = MembershipDeactivateSchema({ inactive_date: '2024-12-31', reason: 'moved' });
    expect(result).toEqual({ inactive_date: '2024-12-31', reason: 'moved' });
  });

  it('accepts an empty payload', () => {
    const result = MembershipDeactivateSchema({});
    expect(result).toEqual({});
  });

  it('rejects an empty inactive_date instead of forwarding it to the date column', () => {
    const result = MembershipDeactivateSchema({ inactive_date: '' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects a non-ISO inactive_date', () => {
    const result = MembershipDeactivateSchema({ inactive_date: '31.12.2024' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });
});
