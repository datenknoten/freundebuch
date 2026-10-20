import { describe, expect, it } from 'vitest';
import { EncounterUpdateInputSchema } from './encounter-update-input.js';

describe('EncounterUpdateSchema', () => {
  it('accepts a partial update with a new type', () => {
    const result = EncounterUpdateInputSchema({ encounter_type: 'video_call' });
    expect(result).toEqual({ encounter_type: 'video_call' });
  });

  it('allows clearing the title with null', () => {
    const result = EncounterUpdateInputSchema({ title: null });
    expect(result).toEqual({ title: null });
  });

  it('rejects a whitespace-only title', () => {
    const result = EncounterUpdateInputSchema({ title: '   ' });
    expect(result.summary).toContain('non-blank title');
  });

  it('rejects an empty date instead of forwarding it to the database', () => {
    const result = EncounterUpdateInputSchema({ encounter_date: '' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects an invalid date format', () => {
    const result = EncounterUpdateInputSchema({ encounter_date: '01/15/2025' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('accepts a valid date', () => {
    const result = EncounterUpdateInputSchema({ encounter_date: '2025-01-15' });
    expect(result).toEqual({ encounter_date: '2025-01-15' });
  });

  it('rejects an unknown interaction type', () => {
    const result = EncounterUpdateInputSchema({ encounter_type: 'smoke_signal' });
    expect(result.summary).toContain('encounter_type');
  });
});
