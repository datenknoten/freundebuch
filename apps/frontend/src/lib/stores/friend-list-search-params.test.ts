import { describe, expect, it } from 'vitest';
import { buildSearchParams } from './friend-list-search-params.js';

describe('buildSearchParams', () => {
  describe('with a query', () => {
    it('omits an empty or whitespace-only query', () => {
      expect(buildSearchParams({ query: '   ', filters: {} }).toString()).toBe('');
    });

    it('sends the trimmed query as q', () => {
      expect(buildSearchParams({ query: '  ada  ', filters: {} }).get('q')).toBe('ada');
    });
  });

  describe('with filters', () => {
    it('joins the values of each facet with commas', () => {
      const params = buildSearchParams({
        query: '',
        filters: { city: ['Berlin', 'Munich'], country: ['DE'] },
      });

      expect(params.get('city')).toBe('Berlin,Munich');
      expect(params.get('country')).toBe('DE');
    });

    it('skips a facet without values', () => {
      const params = buildSearchParams({ query: '', filters: { city: [], country: ['DE'] } });

      expect(params.has('city')).toBe(false);
    });

    it('skips the non-list favorites and archived settings', () => {
      const params = buildSearchParams({
        query: '',
        filters: { favorites: true, archived: 'only' },
      });

      expect(params.toString()).toBe('');
    });
  });
});
