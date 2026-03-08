import { describe, expect, it } from 'vitest';
import { CircleInputSchema } from './circles.js';

describe('CircleInputSchema', () => {
  it('accepts a valid name without color', () => {
    const result = CircleInputSchema({ name: 'Family' });
    expect(result).toEqual({ name: 'Family' });
  });

  it('accepts a valid name with a hex color', () => {
    const result = CircleInputSchema({ name: 'Work', color: '#3B82F6' });
    expect(result).toEqual({ name: 'Work', color: '#3B82F6' });
  });

  it('rejects an invalid hex color without hash', () => {
    const result = CircleInputSchema({ name: 'Work', color: '3B82F6' });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a circle with a valid hex color (e.g., #3B82F6) (was {"name":"Work","color":"3B82F6"})"`,
    );
  });

  it('rejects an invalid hex color with wrong length', () => {
    const result = CircleInputSchema({ name: 'Work', color: '#3B8' });
    expect(result.summary).toMatchInlineSnapshot(
      `"must be a circle with a valid hex color (e.g., #3B82F6) (was {"name":"Work","color":"#3B8"})"`,
    );
  });

  it('rejects an empty name', () => {
    const result = CircleInputSchema({ name: '' });
    expect(result.summary).toMatchInlineSnapshot(`"name must be non-empty"`);
  });
});
