import type { CollectiveRole } from './collective-role.js';

/** Summary of collective for contact detail page */
export interface ContactCollectiveSummary {
  id: string;
  name: string;
  typeName: string;
  role: CollectiveRole;
  membershipId: string;
  isActive: boolean;
}
