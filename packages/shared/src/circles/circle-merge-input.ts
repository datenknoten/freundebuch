import { type } from 'arktype';

/** Schema for merging circles */
export const CircleMergeInputSchema = type({
  source_circle_id: 'string.uuid', // UUID of circle to merge FROM (will be deleted)
});

export type CircleMergeInput = typeof CircleMergeInputSchema.infer;
