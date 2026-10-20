import { type } from 'arktype';
import { DateTypeSchema } from './date-type.js';
import { FriendPreviewResponseSchema } from './friend-preview-response.js';

export const UpcomingDateResponseSchema = type({
  id: 'string',
  dateValue: 'string',
  yearKnown: 'boolean',
  dateType: DateTypeSchema,
  'label?': 'string',
  daysUntil: 'number',
  friend: FriendPreviewResponseSchema,
});

export type UpcomingDateResponse = typeof UpcomingDateResponseSchema.infer;
