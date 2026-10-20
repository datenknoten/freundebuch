import { type } from 'arktype';

export const CircleListQuerySchema = type({
  // 'true' asks for the nested tree instead of a flat list.
  'hierarchy?': 'string',
});

export type CircleListQuery = typeof CircleListQuerySchema.infer;

export interface CircleListOptions {
  isHierarchical: boolean;
}

export function parseCircleListQuery(query: CircleListQuery) {
  const options: CircleListOptions = {
    isHierarchical: query.hierarchy === 'true',
  };
  return options;
}
