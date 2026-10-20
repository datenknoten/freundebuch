import { type } from 'arktype';

/** Schema for updating an existing friend */
export const FriendUpdateInputSchema = type({
  'display_name?': 'string > 0',
  'nickname?': 'string | null',
  'name_prefix?': 'string | null',
  'name_first?': 'string | null',
  'name_middle?': 'string | null',
  'name_last?': 'string | null',
  'name_suffix?': 'string | null',
  'maiden_name?': 'string | null',
  // Personal interests (not employment-related)
  'interests?': 'string | null',
});

export type FriendUpdateInput = typeof FriendUpdateInputSchema.infer;
