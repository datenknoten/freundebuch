import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { EncounterInputSchema } from './encounters.js';

describe('EncounterInputSchema', () => {
  it('accepts a valid encounter', () => {
    const data = {
      title: 'Coffee meetup',
      encounter_date: '2025-01-15',
      friend_ids: ['abc-123'],
    };
    const result = EncounterInputSchema(data);
    expect(result).toEqual(data);
  });

  it('rejects an invalid date format', () => {
    const result = EncounterInputSchema({
      title: 'Coffee',
      encounter_date: '01/15/2025',
      friend_ids: ['abc-123'],
    });
    expect(result).toBeInstanceOf(type.errors);
  });

  it('rejects empty friend_ids', () => {
    const result = EncounterInputSchema({
      title: 'Coffee',
      encounter_date: '2025-01-15',
      friend_ids: [],
    });
    expect(result).toBeInstanceOf(type.errors);
  });

  it('rejects an empty title', () => {
    const result = EncounterInputSchema({
      title: '',
      encounter_date: '2025-01-15',
      friend_ids: ['abc-123'],
    });
    expect(result).toBeInstanceOf(type.errors);
  });

  it('accepts an encounter with optional fields', () => {
    const data = {
      title: 'Dinner',
      encounter_date: '2025-03-20',
      friend_ids: ['abc-123', 'def-456'],
      location_text: 'Restaurant',
      description: 'Great evening',
    };
    const result = EncounterInputSchema(data);
    expect(result).toEqual(data);
  });
});
