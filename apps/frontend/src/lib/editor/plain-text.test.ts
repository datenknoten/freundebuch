import { describe, expect, it } from 'vitest';
import { markdownToPlainText } from './plain-text.js';

describe('markdownToPlainText', () => {
  it('keeps only the link text of an @-mention', () => {
    expect(markdownToPlainText('Heard from [Anna](/friends/abc-123) at lunch')).toBe(
      'Heard from Anna at lunch',
    );
  });

  it('drops emphasis, heading and list markers', () => {
    expect(markdownToPlainText('## Moves\n\n- **soon** to *Leipzig*\n- `Südvorstadt`')).toBe(
      'Moves soon to Leipzig Südvorstadt',
    );
  });

  it('collapses line breaks into single spaces', () => {
    expect(markdownToPlainText('first line\nsecond line\n\nnew paragraph')).toBe(
      'first line second line new paragraph',
    );
  });

  it('keeps raw HTML as visible text', () => {
    expect(markdownToPlainText('a <b>bold</b> claim')).toBe('a <b>bold</b> claim');
  });
});
