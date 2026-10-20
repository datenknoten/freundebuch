import { describe, expect, it } from 'vitest';
import { DateInputSchema } from './date-input.js';

describe('DateInputSchema', () => {
  it('accepts a valid date and defaults year_known to true', () => {
    const result = DateInputSchema({
      date_value: '1990-05-15',
      date_type: 'birthday',
    });
    expect(result).toEqual({ date_value: '1990-05-15', year_known: true, date_type: 'birthday' });
  });

  it('accepts a date with year_known flag', () => {
    const result = DateInputSchema({
      date_value: '2000-12-25',
      year_known: false,
      date_type: 'anniversary',
    });
    expect(result).toEqual({
      date_value: '2000-12-25',
      year_known: false,
      date_type: 'anniversary',
    });
  });

  it('rejects an invalid date_type', () => {
    const result = DateInputSchema({
      date_value: '1990-05-15',
      date_type: 'graduation',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"date_type must be "anniversary", "birthday" or "other" (was "graduation")"`,
    );
  });

  it('rejects an empty date_value instead of forwarding it to the date column', () => {
    const result = DateInputSchema({ date_value: '', date_type: 'birthday' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('rejects a non-ISO date_value', () => {
    const result = DateInputSchema({ date_value: '15.05.1990', date_type: 'birthday' });
    expect(result.summary).toContain('valid date (YYYY-MM-DD format)');
  });

  it('accepts a full date whose year is not known (year_known carries that, not the string)', () => {
    const result = DateInputSchema({
      date_value: '1900-05-15',
      year_known: false,
      date_type: 'birthday',
    });
    expect(result).toEqual({ date_value: '1900-05-15', year_known: false, date_type: 'birthday' });
  });
});
