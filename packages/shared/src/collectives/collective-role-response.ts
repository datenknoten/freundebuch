import { type } from 'arktype';

export const CollectiveRoleResponseSchema = type({
  id: 'string',
  roleKey: 'string',
  label: 'string',
  sortOrder: 'number',
});

export type CollectiveRoleResponse = typeof CollectiveRoleResponseSchema.infer;
