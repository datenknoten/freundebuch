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
    expect(result.summary).toMatchInlineSnapshot(
      `"must be an encounter with a valid date (YYYY-MM-DD format) (was {"title":"Coffee","encounter_date":"01/15/2025","friend_ids":["abc-123"]})"`,
    );
  });

  it('rejects empty friend_ids', () => {
    const result = EncounterInputSchema({
      title: 'Coffee',
      encounter_date: '2025-01-15',
      friend_ids: [],
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be an encounter with at least one friend (was {"title":"Coffee","encounter_date":"2025-01-15","friend_ids":[]})"`,
    );
  });

  it('rejects an empty title', () => {
    const result = EncounterInputSchema({
      title: '',
      encounter_date: '2025-01-15',
      friend_ids: ['abc-123'],
    });
    expect(result.summary).toMatchInlineSnapshot(`"title must be non-empty"`);
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
