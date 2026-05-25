import { describe, expect, it } from 'vitest';
import { ENCOUNTER_TYPES, EncounterInputSchema, EncounterUpdateSchema } from './encounters.js';

describe('EncounterInputSchema', () => {
  it('accepts a valid encounter and defaults the type to in_person', () => {
    const data = {
      title: 'Coffee meetup',
      encounter_date: '2025-01-15',
      friend_ids: ['abc-123'],
    };
    const result = EncounterInputSchema(data);
    expect(result).toEqual({ ...data, encounter_type: 'in_person' });
  });

  it('accepts an encounter without a title (title is optional)', () => {
    const result = EncounterInputSchema({
      encounter_date: '2025-01-15',
      encounter_type: 'phone_call',
      friend_ids: ['abc-123'],
    });
    expect(result).toEqual({
      encounter_date: '2025-01-15',
      encounter_type: 'phone_call',
      friend_ids: ['abc-123'],
    });
  });

  it.each(ENCOUNTER_TYPES)('accepts the %s interaction type', (type) => {
    const result = EncounterInputSchema({
      encounter_date: '2025-01-15',
      encounter_type: type,
      friend_ids: ['abc-123'],
    });
    expect(result).toMatchObject({ encounter_type: type });
  });

  it('rejects an unknown interaction type', () => {
    const result = EncounterInputSchema({
      encounter_date: '2025-01-15',
      encounter_type: 'carrier_pigeon',
      friend_ids: ['abc-123'],
    });
    expect(result.summary).toContain('encounter_type');
  });

  it('rejects an invalid date format', () => {
    const result = EncounterInputSchema({
      title: 'Coffee',
      encounter_date: '01/15/2025',
      friend_ids: ['abc-123'],
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
      friend_ids: ['abc-123'],
    });
    expect(result.summary).toContain('title must be non-empty');
  });

  it('rejects a whitespace-only title', () => {
    const result = EncounterInputSchema({
      title: '   ',
      encounter_date: '2025-01-15',
      friend_ids: ['abc-123'],
    });
    expect(result.summary).toContain('non-blank title');
  });

  it('rejects a title longer than 200 characters', () => {
    const result = EncounterInputSchema({
      title: 'x'.repeat(201),
      encounter_date: '2025-01-15',
      friend_ids: ['abc-123'],
    });
    expect(result.summary).toContain('at most 200 characters');
  });

  it('accepts an encounter with optional fields', () => {
    const data = {
      title: 'Dinner',
      encounter_date: '2025-03-20',
      encounter_type: 'in_person',
      friend_ids: ['abc-123', 'def-456'],
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

  it('rejects an unknown interaction type', () => {
    const result = EncounterUpdateSchema({ encounter_type: 'smoke_signal' });
    expect(result.summary).toContain('encounter_type');
  });
});
