import { describe, expect, it } from 'vitest';
import {
  ENCOUNTER_TYPES,
  EncounterInputSchema,
  EncounterListQuerySchema,
  EncounterUpdateSchema,
} from './encounters.js';

describe('EncounterInputSchema', () => {
  it('accepts a valid encounter and defaults the type to in_person', () => {
    const data = {
      title: 'Coffee meetup',
      encounter_date: '2025-01-15',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    };
    const result = EncounterInputSchema(data);
    expect(result).toEqual({ ...data, encounter_type: 'in_person' });
  });

  it('accepts an encounter without a title (title is optional)', () => {
    const result = EncounterInputSchema({
      encounter_date: '2025-01-15',
      encounter_type: 'phone_call',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result).toEqual({
      encounter_date: '2025-01-15',
      encounter_type: 'phone_call',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
  });

  it.each(ENCOUNTER_TYPES)('accepts the %s interaction type', (type) => {
    const result = EncounterInputSchema({
      encounter_date: '2025-01-15',
      encounter_type: type,
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result).toMatchObject({ encounter_type: type });
  });

  it('rejects an unknown interaction type', () => {
    const result = EncounterInputSchema({
      encounter_date: '2025-01-15',
      encounter_type: 'carrier_pigeon',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('encounter_type');
  });

  it('rejects an invalid date format', () => {
    const result = EncounterInputSchema({
      title: 'Coffee',
      encounter_date: '01/15/2025',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects an empty date', () => {
    const result = EncounterInputSchema({
      title: 'Coffee',
      encounter_date: '',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects empty friend_ids', () => {
    const result = EncounterInputSchema({
      title: 'Coffee',
      encounter_date: '2025-01-15',
      friend_ids: [],
    });
    expect(result.summary).toContain('at least one friend');
  });

  it('rejects an empty title when one is provided', () => {
    const result = EncounterInputSchema({
      title: '',
      encounter_date: '2025-01-15',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('title must be non-empty');
  });

  it('rejects a whitespace-only title', () => {
    const result = EncounterInputSchema({
      title: '   ',
      encounter_date: '2025-01-15',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('non-blank title');
  });

  it('rejects a title longer than 200 characters', () => {
    const result = EncounterInputSchema({
      title: 'x'.repeat(201),
      encounter_date: '2025-01-15',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('at most 200 characters');
  });

  it('accepts an encounter with optional fields', () => {
    const data = {
      title: 'Dinner',
      encounter_date: '2025-03-20',
      encounter_type: 'in_person',
      friend_ids: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
      location_text: 'Restaurant',
      description: 'Great evening',
    };
    const result = EncounterInputSchema(data);
    expect(result).toEqual(data);
  });
});

describe('EncounterUpdateSchema', () => {
  it('accepts a partial update with a new type', () => {
    const result = EncounterUpdateSchema({ encounter_type: 'video_call' });
    expect(result).toEqual({ encounter_type: 'video_call' });
  });

  it('allows clearing the title with null', () => {
    const result = EncounterUpdateSchema({ title: null });
    expect(result).toEqual({ title: null });
  });

  it('rejects a whitespace-only title', () => {
    const result = EncounterUpdateSchema({ title: '   ' });
    expect(result.summary).toContain('non-blank title');
  });

  it('rejects an empty date instead of forwarding it to the database', () => {
    const result = EncounterUpdateSchema({ encounter_date: '' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects an invalid date format', () => {
    const result = EncounterUpdateSchema({ encounter_date: '01/15/2025' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('accepts a valid date', () => {
    const result = EncounterUpdateSchema({ encounter_date: '2025-01-15' });
    expect(result).toEqual({ encounter_date: '2025-01-15' });
  });

  it('rejects an unknown interaction type', () => {
    const result = EncounterUpdateSchema({ encounter_type: 'smoke_signal' });
    expect(result.summary).toContain('encounter_type');
  });
});

describe('EncounterListQuerySchema', () => {
  it('treats an empty date filter as absent', () => {
    const result = EncounterListQuerySchema({ from_date: '', to_date: '' });
    expect(result).toEqual({ from_date: '', to_date: '' });
  });

  it('accepts YYYY-MM-DD date filters', () => {
    const result = EncounterListQuerySchema({ from_date: '2025-01-01', to_date: '2025-12-31' });
    expect(result).toEqual({ from_date: '2025-01-01', to_date: '2025-12-31' });
  });

  it('rejects a malformed from_date instead of casting it in SQL', () => {
    const result = EncounterListQuerySchema({ from_date: 'last-tuesday' });
    expect(result.summary).toContain('from_date');
  });

  it('rejects a malformed to_date instead of casting it in SQL', () => {
    const result = EncounterListQuerySchema({ to_date: '31.12.2025' });
    expect(result.summary).toContain('to_date');
  });
});
