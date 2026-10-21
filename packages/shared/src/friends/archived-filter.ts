import { type } from 'arktype';

// 'exclude' (hide archived) is the default.
export const ARCHIVED_FILTERS = ['include', 'exclude', 'only'] as const;

export const ArchivedFilterSchema = type.enumerated(...ARCHIVED_FILTERS);

export type ArchivedFilter = typeof ArchivedFilterSchema.infer;
