import { type } from 'arktype';

/**
 * Date validation shared by every schema that feeds a Postgres `date` column.
 *
 * Keeping one definition matters because the failure mode of getting it wrong is
 * invisible at the boundary: a value the schema lets through (`''` was the classic
 * one) arrives at the query as an invalid date literal, so the request fails with a
 * 500 instead of the 400 the caller earned.
 */

/** The only date shape this API accepts on the wire. */
export const IsoDateString = type('/^\\d{4}-\\d{2}-\\d{2}$/');

/** A date filter in a query string: absent or empty both mean "no filter". */
export const IsoDateFilter = IsoDateString.or('""');
