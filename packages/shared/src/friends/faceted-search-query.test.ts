import { ValidationError } from '@datenknoten/kit';
import { describe, expect, it } from 'vitest';
import { FacetedSearchQuerySchema, parseFacetedSearchQuery } from './faceted-search-query.js';

function parse(query: Record<string, string>) {
  const validated = FacetedSearchQuerySchema.assert(query);
  return parseFacetedSearchQuery(validated);
}

describe('parseFacetedSearchQuery', () => {
  describe('relationship_category filter', () => {
    it('keeps every known category', () => {
      const options = parse({ relationship_category: 'family, social' });
      expect(options.filters.relationship_category).toEqual(['family', 'social']);
    });

    it('leaves the filter unset when the parameter is absent', () => {
      const options = parse({});
      expect(options.filters.relationship_category).toBeUndefined();
    });

    it('throws a ValidationError naming every unknown category', () => {
      expect(() => parse({ relationship_category: 'family,enemies,rivals' })).toThrow(
        new ValidationError('Invalid relationship_category: enemies, rivals', {
          relationship_category: ['enemies', 'rivals'],
        }),
      );
    });
  });
});
