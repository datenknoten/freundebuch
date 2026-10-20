import { type } from 'arktype';

export const CircleMergeInputSchema = type({
  source_circle_id: 'string.uuid', // Deleted after the merge.
});

export type CircleMergeInput = typeof CircleMergeInputSchema.infer;
