import { type } from 'arktype';

/**
 * The `pagination` half of the one envelope every paginated endpoint returns:
 * `{ data: X[], pagination: PaginationInfo }`.
 *
 * Before this existed each endpoint invented its own: `{ friends, total, page,
 * pageSize, totalPages }`, `{ results, total, … }`, `{ collectives, pagination }`,
 * `{ encounters, pagination }`. Three envelopes and two places to look for the
 * total meant every consumer special-cased the endpoint it was talking to.
 */
export const PaginationInfoSchema = type({
  page: 'number',
  pageSize: 'number',
  totalCount: 'number',
  totalPages: 'number',
});

export type PaginationInfo = typeof PaginationInfoSchema.infer;
