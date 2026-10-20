import type { DateType } from './date-type.js';

// Epic 1B: Extended field response interfaces

/** Important date in API responses */
export interface FriendDate {
  id: string;
  dateValue: string;
  yearKnown: boolean;
  dateType: DateType;
  label?: string;
  createdAt: string;
}
