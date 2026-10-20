import { type } from 'arktype';

/** Schema for circle list query parameters */
export const CircleListQuerySchema = type({
  'hierarchy?': 'string', // 'true' to get hierarchical structure
});

export type CircleListQuery = typeof CircleListQuerySchema.infer;

/** Parsed circle list options */
export interface CircleListOptions {
  isHierarchical: boolean;
}

/**
 * Parse and validate circle list query parameters
 */
export function parseCircleListQuery(query: CircleListQuery): CircleListOptions {
  return {
    isHierarchical: query.hierarchy === 'true',
  };
}
