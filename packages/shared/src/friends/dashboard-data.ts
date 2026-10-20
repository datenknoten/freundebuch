import type { NetworkGraphData } from './network-graph.js';
import type { UpcomingDate } from './upcoming-date.js';

/**
 * Consolidated dashboard payload.
 * Bundles the home page widgets into a single response so the dashboard
 * can load with one request instead of several.
 */
export interface DashboardData {
  upcomingDates: UpcomingDate[];
  networkGraph: NetworkGraphData;
}
