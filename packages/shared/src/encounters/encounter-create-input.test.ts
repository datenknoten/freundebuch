import { describe, expect, it } from 'vitest';
import { EncounterCreateInputSchema } from './encounter-create-input.js';
import { ENCOUNTER_TYPES } from './encounter-type.js';

describe('EncounterInputSchema', () => {
  it('accepts a valid encounter and defaults the type to in_person', () => {
    const data = {
      title: 'Coffee meetup',
      encounter_date: '2025-01-15',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    };
    const result = EncounterCreateInputSchema(data);
    expect(result).toEqual({ ...data, encounter_type: 'in_person' });
  });

  it('accepts an encounter without a title (title is optional)', () => {
    const result = EncounterCreateInputSchema({
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
    const result = EncounterCreateInputSchema({
      encounter_date: '2025-01-15',
      encounter_type: type,
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result).toMatchObject({ encounter_type: type });
  });

  it('rejects an unknown interaction type', () => {
    const result = EncounterCreateInputSchema({
      encounter_date: '2025-01-15',
      encounter_type: 'carrier_pigeon',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('encounter_type');
  });

  it('rejects an invalid date format', () => {
    const result = EncounterCreateInputSchema({
      title: 'Coffee',
      encounter_date: '01/15/2025',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects an empty date', () => {
    const result = EncounterCreateInputSchema({
      title: 'Coffee',
      encounter_date: '',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects empty friend_ids', () => {
    const result = EncounterCreateInputSchema({
      title: 'Coffee',
      encounter_date: '2025-01-15',
      friend_ids: [],
    });
    expect(result.summary).toContain('friend_ids must be non-empty');
  });

  it('reports an invalid date and empty friend_ids together', () => {
    const result = EncounterCreateInputSchema({
      encounter_date: '01/15/2025',
      friend_ids: [],
    });
    expect(result.summary).toContain('encounter_date must be a valid date (YYYY-MM-DD format)');
    expect(result.summary).toContain('friend_ids must be non-empty');
  });

  it('rejects an empty title when one is provided', () => {
    const result = EncounterCreateInputSchema({
      title: '',
      encounter_date: '2025-01-15',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('title must be non-empty');
  });

  it('rejects a whitespace-only title', () => {
    const result = EncounterCreateInputSchema({
      title: '   ',
      encounter_date: '2025-01-15',
      friend_ids: ['11111111-1111-4111-8111-111111111111'],
    });
    expect(result.summary).toContain('non-blank title');
  });

  it('rejects a title longer than 200 characters', () => {
    const result = EncounterCreateInputSchema({
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
    const result = EncounterCreateInputSchema(data);
    expect(result).toEqual(data);
  });
});
