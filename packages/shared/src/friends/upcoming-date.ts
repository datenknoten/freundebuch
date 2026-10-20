import type { DateType } from './date-type.js';
import type { FriendPreview } from './friend-preview.js';

/** Upcoming date with friend info for dashboard */
export interface UpcomingDate {
  id: string;
  dateValue: string;
  yearKnown: boolean;
  dateType: DateType;
  label?: string;
  daysUntil: number;
  friend: FriendPreview;
}
