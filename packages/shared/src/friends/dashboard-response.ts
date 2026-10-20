import { type } from 'arktype';
import { NetworkGraphResponseSchema } from './network-graph-response.js';
import { UpcomingDateResponseSchema } from './upcoming-date-response.js';

/**
 * Bundles the home page widgets into a single response so the dashboard
 * can load with one request instead of several.
 */
export const DashboardResponseSchema = type({
  upcomingDates: UpcomingDateResponseSchema.array(),
  networkGraph: NetworkGraphResponseSchema,
});

export type DashboardResponse = typeof DashboardResponseSchema.infer;
